from flask import Flask
from datetime import date, datetime
from config import Config
from .extensions import db, jwt, mail
from .routes.main import main_bp
from .routes.auth import auth_bp
from .routes.jobs import jobs_bp
from .routes.users import users_bp
from .routes.admin_actions import admin_actions_bp
import os

def date_converter(o):
    if isinstance(o, (date, datetime)):
        return o.isoformat()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    app.json.default = date_converter

    
    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)

   
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(jobs_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(admin_actions_bp)
    
    
    UPLOAD_FOLDER = 'static/resumes'
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    app.config['ALLOWED_EXTENSIONS'] = {'pdf'}

    return app

