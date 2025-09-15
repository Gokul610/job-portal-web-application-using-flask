import os

class Config:
    

    SECRET_KEY = os.environ.get('SECRET_KEY') or 'd5d28018304c0e24c4e21167073e9266'
    MYSQL_HOST = os.environ.get('MYSQL_HOST') or 'localhost'
    MYSQL_USER = os.environ.get('MYSQL_USER') or 'root'
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD') or 'Karthick7'
    MYSQL_DB = os.environ.get('MYSQL_DB') or 'job_portal_db1'
    MYSQL_CURSORCLASS = 'DictCursor'
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True

    MAIL_USERNAME = os.environ.get('MAIL_USERNAME') or 'gokulkarthick623@gmail.com'
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD') or 'zxflultynicbtpar'

    MAIL_DEFAULT_SENDER = ('JobFinder', MAIL_USERNAME)

