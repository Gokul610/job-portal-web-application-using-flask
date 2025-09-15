from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from werkzeug.utils import secure_filename
from job_portal.extensions import db
import uuid
import os

jobs_bp = Blueprint('jobs_bp', __name__)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

@jobs_bp.route('/api/jobs', methods=['GET'])
def get_jobs():
    search_term = request.args.get('search', '')
    try:
        cursor = db.connection.cursor()
        query = """
            SELECT j.job_id, j.job_title, j.location, j.description, j.job_type, 
                   j.salary_range, j.skills_required, j.application_deadline, ep.company_name
            FROM Jobs j JOIN EmployerProfiles ep ON j.employer_id = ep.user_id
            WHERE j.status = 'approved' AND (j.application_deadline IS NULL OR j.application_deadline >= CURDATE())
        """
        params = []
        if search_term:
            search_like = f"%{search_term}%"
            query += " AND (j.job_title LIKE %s OR ep.company_name LIKE %s OR j.location LIKE %s OR j.skills_required LIKE %s)"
            params.extend([search_like, search_like, search_like, search_like])
        query += " ORDER BY j.created_at DESC;"
        cursor.execute(query, params)
        jobs = cursor.fetchall()
        cursor.close()
        return jsonify(jobs)
    except Exception as e:
        current_app.logger.error(f"Get Jobs Error: {e}")
        return jsonify({"msg": "Could not retrieve jobs"}), 500


@jobs_bp.route('/api/jobs/<int:job_id>', methods=['DELETE'])
@jwt_required()
def delete_job_post(job_id):
    claims = get_jwt()
    user_id = get_jwt_identity()
    user_type = claims.get('user_type')
    cursor = db.connection.cursor()
    try:
        if user_type == 1:
            cursor.execute("DELETE FROM Jobs WHERE job_id = %s", [job_id])
        elif user_type == 2:
            cursor.execute("DELETE FROM Jobs WHERE job_id = %s AND employer_id = %s", (job_id, user_id))
        else: return jsonify({"msg": "Unauthorized action"}), 403
        if cursor.rowcount == 0: return jsonify({"msg": "Job not found or permission denied"}), 404
        db.connection.commit()
        return jsonify({"msg": "Job post deleted successfully"})
    except Exception as e: return jsonify({"msg": "Error deleting job"}), 500
    finally: cursor.close()

@jobs_bp.route('/api/jobs/<int:job_id>/apply', methods=['POST'])
@jwt_required()
def apply_for_job(job_id):
    user_id = get_jwt_identity()
    if 'resume' not in request.files: return jsonify({"msg": "No resume file provided"}), 400
    file = request.files['resume']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({"msg": "Invalid file type, only PDF is allowed"}), 400
    filename = secure_filename(f"{user_id}_{uuid.uuid4()}.pdf")
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    conn = db.connection
    cursor = conn.cursor()
    try:
        file.save(filepath)
        form_data = request.form
        cursor.execute("INSERT INTO Applications (job_id, job_seeker_id, expected_salary) VALUES (%s, %s, %s)",
                       (job_id, user_id, form_data.get('expected_salary')))
        cursor.execute("UPDATE JobSeekerProfiles SET phone_number = %s, gender = %s, preferred_location = %s, resume_url = %s WHERE user_id = %s",
                       (form_data.get('phone_number'), form_data.get('gender'), form_data.get('preferred_location'), filepath, user_id))
        conn.commit()
        return jsonify({"msg": "Application submitted successfully"})
    except Exception as e:
        conn.rollback()
        if os.path.exists(filepath): os.remove(filepath)
        return jsonify({"msg": "Failed to submit application"}), 500
    finally:
        cursor.close()

@jobs_bp.route('/api/jobs/<int:job_id>/applicants', methods=['GET'])
@jwt_required()
def get_job_applicants(job_id):
    user_id = get_jwt_identity()
    claims = get_jwt()
    user_type = claims.get('user_type')
    if user_type not in [1, 2]: return jsonify({"msg": "Unauthorized"}), 403
    cursor = db.connection.cursor()
    if user_type == 2:
        cursor.execute("SELECT employer_id FROM Jobs WHERE job_id = %s", [job_id])
        job = cursor.fetchone()
        if not job or str(job['employer_id']) != user_id:
            cursor.close()
            return jsonify({"msg": "Unauthorized"}), 403
    cursor.execute("""
        SELECT u.email, jsp.*, a.application_date, a.expected_salary
        FROM Applications a JOIN Users u ON a.job_seeker_id = u.user_id
        JOIN JobSeekerProfiles jsp ON u.user_id = jsp.user_id WHERE a.job_id = %s
    """, [job_id])
    applicants = cursor.fetchall()
    cursor.close()
    return jsonify(applicants)

