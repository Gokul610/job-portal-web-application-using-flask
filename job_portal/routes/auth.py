from flask import Blueprint, jsonify, render_template, request, redirect, url_for, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
from flask_mail import Message
from itsdangerous import URLSafeTimedSerializer
from job_portal.extensions import db, mail

auth_bp = Blueprint('auth_bp', __name__,template_folder="templates")


@auth_bp.route('/verify-email/<token>')
def verify_email(token):
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        email = serializer.loads(token, salt='email-confirm', max_age=3600) 
    except Exception:
        return "<h1>The confirmation link is invalid or has expired.</h1>", 400

    conn = db.connection
    cursor = conn.cursor()
    cursor.execute("UPDATE Users SET status_flag = 'active' WHERE email = %s AND status_flag = 'unverified'", [email])
    conn.commit()
    cursor.close()
    return redirect(url_for('main_bp.home', verified='true'))
@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', None)
    password = data.get('password', None)
    if not email or not password: return jsonify({"msg": "Missing email or password"}), 400
    try:
        cursor = db.connection.cursor()
        
        cursor.execute("SELECT user_id, password_hash, user_type, status, status_flag FROM Users WHERE email = %s", [email])
        user = cursor.fetchone()
        cursor.close()
        
        if user and check_password_hash(user['password_hash'], password):
           
            if user['status_flag'] != 'active':
                return jsonify({"msg": "Your account is awaiting email verification."}), 403

            
            if user['user_type'] == 1 and user['status'] != 'active':
                return jsonify({"msg": "Your admin account is awaiting approval."}), 403

            identity_data = {"user_type": user['user_type']}
            str_user_id = str(user['user_id'])
            access_token = create_access_token(identity=str_user_id, additional_claims=identity_data)
            return jsonify(access_token=access_token)
        else:
            return jsonify({"msg": "Incorrect email or password"}), 401
    except Exception as e:
        current_app.logger.error(f"Login Error: {e}")
        return jsonify({"msg": "An internal error occurred"}), 500

@auth_bp.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    email, password, user_type = data.get('email'), data.get('password'), data.get('userType')
    if not all([email, password, user_type]): return jsonify({"msg": "Missing required fields"}), 400
    password_hash = generate_password_hash(password)
    
   
    status = 'pending_approval' if user_type == 1 else 'active'
   
    status_flag = 'unverified'

    conn = db.connection
    cursor = conn.cursor()
    try:
        if user_type == 1:
            cursor.execute("SELECT email FROM company_employees WHERE email = %s", [email])
            if not cursor.fetchone():
                return jsonify({"msg": "This email address is not authorized for admin registration."}), 403
        
        cursor.execute("SELECT user_id FROM Users WHERE email = %s", [email])
        if cursor.fetchone(): return jsonify({"msg": "Email address already registered"}), 409
        
        
        cursor.execute("INSERT INTO Users (email, password_hash, user_type, status, status_flag) VALUES (%s, %s, %s, %s, %s)",
                       (email, password_hash, user_type, status, status_flag))
        user_id = cursor.lastrowid

        
        if user_type == 3 or user_type == 1:
            cursor.execute("INSERT INTO JobSeekerProfiles (user_id, first_name, last_name, date_of_birth, educational_qualification) VALUES (%s, %s, %s, %s, %s)",
                           (user_id, data.get('firstName'), data.get('lastName'), data.get('dob'), data.get('education')))
        elif user_type == 2:
            cursor.execute("INSERT INTO EmployerProfiles (user_id, contact_first_name, contact_last_name, company_name) VALUES (%s, %s, %s, %s)",
                           (user_id, data.get('firstName'), data.get('lastName'), data.get('companyName')))
        conn.commit()

        serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
        
        try:
            token = serializer.dumps(email, salt='email-confirm')
            confirm_url = url_for('auth_bp.verify_email', token=token, _external=True)
            html = render_template('email_verification.html', confirm_url=confirm_url)
            subject = "Please confirm your email for JobFinder"
            msg = Message(subject, recipients=[email], html=html)
            mail.send(msg)
        except Exception as e:
            current_app.logger.error(f"Mail sending failed for {email}: {e}")
        msg = "Registration submitted! Please check your email to verify your account."
        if user_type == 1:
            msg = "Admin registration submitted! Your request will be reviewed after email verification."
        
        return jsonify({"msg": msg}), 201
    except Exception as e:
        conn.rollback()
        current_app.logger.error(f"Registration Error: {e}")
        return jsonify({"msg": "Registration failed"}), 500
    finally:
        cursor.close()


@auth_bp.route('/api/resend-verification', methods=['POST'])
def resend_verification():
    data = request.get_json()
    email = data.get('email')
    if not email: return jsonify({"msg": "Email is required"}), 400

    cursor = db.connection.cursor()
    cursor.execute("SELECT status_flag FROM Users WHERE email = %s", [email])
    user = cursor.fetchone()
    if not user or user['status_flag'] != 'unverified':
        cursor.close()
        return jsonify({"msg": "This account does not require verification or does not exist."}), 400
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        token = serializer.dumps(email, salt='email-confirm')
        confirm_url = url_for('auth_bp.verify_email', token=token, _external=True)
        html = render_template('email_verification.html', confirm_url=confirm_url)
        subject = "Your JobPortal Verification Link"
        msg = Message(subject, recipients=[email], html=html)
        mail.send(msg)
        cursor.close()
        return jsonify({"msg": "A new verification email has been sent."})
    except Exception as e:
        current_app.logger.error(f"Resend mail error: {e}")
        cursor.close()
        return jsonify({"msg": "Failed to send email."}), 500


