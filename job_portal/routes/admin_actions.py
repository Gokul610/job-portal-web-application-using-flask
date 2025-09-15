from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from job_portal.extensions import db

admin_actions_bp = Blueprint('admin_actions_bp', __name__)

@admin_actions_bp.route('/api/admin/pending-users', methods=['GET'])
@jwt_required()
def get_pending_users():
    claims = get_jwt()
    if claims.get('user_type') != 1: return jsonify({"msg": "Admins only"}), 403
    cursor = db.connection.cursor()
    cursor.execute("""
        SELECT u.user_id, u.email, jsp.first_name, jsp.last_name
        FROM Users u JOIN JobSeekerProfiles jsp ON u.user_id = jsp.user_id
        WHERE u.status = 'pending_approval' AND u.user_type = 1
        ORDER BY u.created_at ASC
    """)
    users = cursor.fetchall()
    cursor.close()
    return jsonify(users)

@admin_actions_bp.route('/api/admin/users/<int:user_id>/approve', methods=['PUT'])
@jwt_required()
def approve_user(user_id):
    claims = get_jwt()
    if claims.get('user_type') != 1: return jsonify({"msg": "Admins only"}), 403
    conn = db.connection
    cursor = conn.cursor()
    cursor.execute("UPDATE Users SET status = 'active' WHERE user_id = %s AND status = 'pending_approval'", [user_id])
    conn.commit()
    cursor.close()
    return jsonify({"msg": "Admin user approved successfully"})

@admin_actions_bp.route('/api/admin/pending-jobs', methods=['GET'])
@jwt_required()
def get_pending_jobs():
    claims = get_jwt()
    if claims.get('user_type') != 1: return jsonify({"msg": "Admins only"}), 403
    cursor = db.connection.cursor()
    cursor.execute("""
        SELECT j.job_id, j.job_title, ep.company_name FROM Jobs j 
        JOIN EmployerProfiles ep ON j.employer_id = ep.user_id WHERE status = 'pending' ORDER BY j.created_at
    """)
    jobs = cursor.fetchall()
    cursor.close()
    return jsonify(jobs)


@admin_actions_bp.route('/api/admin/all-jobs', methods=['GET'])
@jwt_required()
def get_all_jobs_paginated():
    claims = get_jwt()
    if claims.get('user_type') != 1: return jsonify({"msg": "Admins only"}), 403
    page = request.args.get('page', 1, type=int)
    per_page = 10
    offset = (page - 1) * per_page
    cursor = db.connection.cursor()
    cursor.execute("""
        SELECT j.job_id, j.job_title, ep.company_name, j.status
        FROM Jobs j JOIN EmployerProfiles ep ON j.employer_id = ep.user_id
        ORDER BY j.created_at DESC LIMIT %s OFFSET %s
    """, (per_page, offset))
    jobs = cursor.fetchall()
    cursor.execute("SELECT COUNT(*) as total FROM Jobs")
    total_jobs = cursor.fetchone()['total']
    cursor.close()
    has_more = (offset + per_page) < total_jobs
    return jsonify({"jobs": jobs, "has_more": has_more})


@admin_actions_bp.route('/api/admin/jobs/<int:job_id>/approve', methods=['PUT'])
@jwt_required()
def approve_job(job_id):
    claims = get_jwt()
    if claims.get('user_type') != 1: return jsonify({"msg": "Admins only"}), 403
    cursor = db.connection.cursor()
    cursor.execute("UPDATE Jobs SET status = 'approved' WHERE job_id = %s", [job_id])
    db.connection.commit()
    cursor.close()
    return jsonify({"msg": "Job approved successfully"})

@admin_actions_bp.route('/api/admin/jobs/<int:job_id>/reject', methods=['PUT'])
@jwt_required()
def reject_job(job_id):
    claims = get_jwt()
    if claims.get('user_type') != 1: return jsonify({"msg": "Admins only"}), 403
    cursor = db.connection.cursor()
    cursor.execute("UPDATE Jobs SET status = 'rejected' WHERE job_id = %s", [job_id])
    db.connection.commit()
    cursor.close()
    return jsonify({"msg": "Job rejected successfully"})

@admin_actions_bp.route('/api/admin/users', methods=['GET'])
@jwt_required()
def get_all_users():
    claims = get_jwt()
    if claims.get('user_type') != 1: return jsonify({"msg": "Admins only"}), 403
    cursor = db.connection.cursor()

    cursor.execute("""
        SELECT u.user_id, u.email, u.user_type, u.created_at, u.status, u.status_flag,
               jsp.first_name, jsp.last_name, jsp.phone_number,
               ep.company_name, ep.contact_first_name, ep.contact_last_name
        FROM Users u
        LEFT JOIN JobSeekerProfiles jsp ON u.user_id = jsp.user_id AND u.user_type IN (1, 3)
        LEFT JOIN EmployerProfiles ep ON u.user_id = ep.user_id AND u.user_type = 2
        ORDER BY u.created_at DESC
    """)
    users = cursor.fetchall()
    cursor.close()
    return jsonify(users)


@admin_actions_bp.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    claims = get_jwt()
    if claims.get('user_type') != 1:
        return jsonify({"msg": "Admins only"}), 403
    
    current_admin_id = get_jwt_identity()
    if str(user_id) == str(current_admin_id):
        return jsonify({"msg": "Admin cannot delete their own account"}), 400

    conn = db.connection
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM Users WHERE user_id = %s", [user_id])
        if cursor.rowcount == 0:
            return jsonify({"msg": "User not found"}), 404
        conn.commit()
        return jsonify({"msg": "User deleted successfully"})
    except Exception as e:
        conn.rollback()
        current_app.logger.error(f"Delete User Error: {e}")
        return jsonify({"msg": "Error deleting user"}), 500
    finally:
        cursor.close()
@admin_actions_bp.route('/api/admin/employers', methods=['GET'])
@jwt_required()
def get_all_employers():
    claims = get_jwt()
    if claims.get('user_type') != 1: return jsonify({"msg": "Admins only"}), 403
    cursor = db.connection.cursor()
    cursor.execute("SELECT u.user_id, u.email, ep.company_name FROM Users u JOIN EmployerProfiles ep ON u.user_id = ep.user_id WHERE u.user_type=2")
    employers = cursor.fetchall()
    cursor.close()
    return jsonify(employers)

