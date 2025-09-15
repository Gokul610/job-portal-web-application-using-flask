from flask import Blueprint, render_template, send_from_directory, current_app

main_bp = Blueprint('main_bp', __name__)

@main_bp.route('/')
def home():
    return render_template('index.html')

@main_bp.route('/job_seeker_dashboard')
def job_seeker_dashboard_page():
    return render_template('job_seeker_dashboard.html')

@main_bp.route('/employer_dashboard')
def employer_dashboard_page():
    return render_template('employer_dashboard.html')

@main_bp.route('/admin_dashboard')
def admin_dashboard_page():
    return render_template('admin_dashboard.html')

@main_bp.route('/about')
def about_page():
    return render_template('about.html')

@main_bp.route('/contact')
def contact_page():
    return render_template('contact.html')

@main_bp.route('/privacy')
def privacy_page():
    return render_template('privacy.html')

@main_bp.route('/terms')
def terms_page():
    return render_template('terms.html')

@main_bp.route('/static/resumes/<path:filename>')
def serve_resume(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)

