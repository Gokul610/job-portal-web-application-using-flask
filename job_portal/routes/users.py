from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from werkzeug.security import check_password_hash, generate_password_hash
from job_portal.extensions import db

users_bp = Blueprint('users_bp', __name__)

@users_bp.route('/api/user/profile', methods=['GET', 'PUT'])
@jwt_required()
def user_profile():
    user_id = get_jwt_identity()
    claims = get_jwt()
    user_type = claims.get('user_type')
    conn = db.connection
    cursor = conn.cursor()
    
    if request.method == 'GET':
        profile = None
        if user_type == 3:
            cursor.execute("SELECT u.email, jsp.* FROM Users u JOIN JobSeekerProfiles jsp ON u.user_id = jsp.user_id WHERE u.user_id = %s", [user_id])
            profile = cursor.fetchone()
            if profile:
                cursor.execute("SELECT preferred_job_role FROM JobSeekerPreferences WHERE user_id = %s", [user_id])
                roles = [row['preferred_job_role'] for row in cursor.fetchall()]
                profile['preferred_job_roles'] = ", ".join(roles)
        elif user_type == 2:
             cursor.execute("SELECT u.email, ep.* FROM Users u JOIN EmployerProfiles ep ON u.user_id = ep.user_id WHERE u.user_id = %s", [user_id])
             profile = cursor.fetchone()
        else: 
            
            cursor.execute("SELECT u.email, jsp.* FROM Users u LEFT JOIN JobSeekerProfiles jsp ON u.user_id=jsp.user_id WHERE u.user_id = %s", [user_id])
            profile = cursor.fetchone()
        cursor.close()
        return jsonify(profile) if profile else ({}, 404)

    if request.method == 'PUT':
        data = request.get_json()
        try:
            
            if user_type == 3 or user_type == 1:
                cursor.execute("""
                    UPDATE JobSeekerProfiles SET first_name=%s, last_name=%s, phone_number=%s, gender=%s, 
                    educational_qualification=%s, preferred_location=%s, skills=%s, date_of_birth=%s WHERE user_id=%s
                """, (data.get('first_name'), data.get('last_name'), data.get('phone_number'), data.get('gender'), 
                      data.get('educational_qualification'), data.get('preferred_location'), data.get('skills'), data.get('date_of_birth'), user_id))
                
                cursor.execute("DELETE FROM JobSeekerPreferences WHERE user_id = %s", [user_id])
                roles_str = data.get('preferred_job_roles', '')
                if roles_str:
                    roles = [role.strip() for role in roles_str.split(',')][:5]
                    for role in roles:
                        if role:
                           cursor.execute("INSERT INTO JobSeekerPreferences (user_id, preferred_job_role) VALUES (%s, %s)", (user_id, role))

            elif user_type == 2:
                cursor.execute("""
                    UPDATE EmployerProfiles SET contact_first_name=%s, contact_last_name=%s, company_name=%s, 
                    company_location=%s, company_website=%s, company_description=%s WHERE user_id=%s
                """, (data.get('contact_first_name'), data.get('contact_last_name'), data.get('company_name'), 
                      data.get('company_location'), data.get('company_website'), data.get('company_description'), user_id))
            
            conn.commit()
            cursor.close()
            return jsonify({"msg": "Profile updated successfully"})
        except Exception as e:
            conn.rollback()
            cursor.close()
            current_app.logger.error(f"Profile update error: {e}")
            return jsonify({"msg": "Failed to update profile"}), 500


@users_bp.route('/api/user/password', methods=['PUT'])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    data = request.get_json()
    old_password, new_password = data.get('old_password'), data.get('new_password')
    cursor = db.connection.cursor()
    cursor.execute("SELECT password_hash FROM Users WHERE user_id = %s", [user_id])
    user = cursor.fetchone()
    if not user or not check_password_hash(user['password_hash'], old_password):
        cursor.close()
        return jsonify({"msg": "Old password is not correct"}), 401
    new_password_hash = generate_password_hash(new_password)
    cursor.execute("UPDATE Users SET password_hash = %s WHERE user_id = %s", (new_password_hash, user_id))
    db.connection.commit()
    cursor.close()
    return jsonify({"msg": "Password updated successfully"})
@users_bp.route('/api/user/applications', methods=['GET'])
@jwt_required()
def get_user_applications():
    user_id = get_jwt_identity()
    cursor = db.connection.cursor()
    cursor.execute("SELECT job_id FROM Applications WHERE job_seeker_id = %s", [user_id])
    applied_jobs = [item['job_id'] for item in cursor.fetchall()]
    cursor.close()
    return jsonify(applied_jobs)




@users_bp.route('/api/user/preferences', methods=['GET'])
@jwt_required()
def get_user_preferences():
    user_id = get_jwt_identity()
    cursor = db.connection.cursor()
    cursor.execute("SELECT preferred_location FROM JobSeekerProfiles WHERE user_id = %s", [user_id])
    profile = cursor.fetchone()
    cursor.execute("SELECT preferred_job_role FROM JobSeekerPreferences WHERE user_id = %s", [user_id])
    roles = [row['preferred_job_role'] for row in cursor.fetchall()]
    cursor.close()
    return jsonify({"preferred_location": profile['preferred_location'] if profile else None, "preferred_roles": roles})

@users_bp.route('/api/dashboard/applications')
@jwt_required()
def get_dashboard_applications():
    user_id = get_jwt_identity()
    cursor = db.connection.cursor()
    cursor.execute("""
        SELECT j.job_title, ep.company_name, a.application_date, a.status
        FROM Applications a JOIN Jobs j ON a.job_id = j.job_id
        JOIN EmployerProfiles ep ON j.employer_id = ep.user_id
        WHERE a.job_seeker_id = %s ORDER BY a.application_date DESC
    """, [user_id])
    applications = cursor.fetchall()
    cursor.close()
    return jsonify(applications)
@users_bp.route('/api/employer/jobs', methods=['GET', 'POST'])
@jwt_required()
def employer_jobs():
    user_id = get_jwt_identity()
    claims = get_jwt()
    user_type = claims.get('user_type')
    is_admin_posting = user_type == 1 and request.method == 'POST'
    is_employer_action = user_type == 2
    if not is_employer_action and not is_admin_posting: return jsonify({"msg": "Action not allowed"}), 403
    conn = db.connection
    cursor = conn.cursor()
    if request.method == 'GET':
        cursor.execute("SELECT job_id, job_title, created_at, status FROM Jobs WHERE employer_id = %s ORDER BY created_at DESC", [user_id])
        jobs = cursor.fetchall()
        cursor.close()
        return jsonify(jobs)
    if request.method == 'POST':
        data = request.get_json()
        status = 'approved' if is_admin_posting else 'pending'
        post_user_id = data.get('employer_id') if is_admin_posting else user_id
        try:
            cursor.execute("""
                INSERT INTO Jobs (employer_id, job_title, location, job_type, salary_range, openings, education_required, skills_required, application_deadline, description, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (post_user_id, data['job_title'], data['location'], data['job_type'], data['salary_range'], data['openings'], data['education_required'], data['skills_required'], data['application_deadline'], data['description'], status))
            conn.commit()
            cursor.close()
            return jsonify({"msg": "Job submitted for approval" if status == 'pending' else "Job posted successfully"}), 201
        except Exception as e: return jsonify({"msg": "Failed to post job"}), 500


