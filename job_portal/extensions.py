from flask_mysqldb import MySQL
from flask_jwt_extended import JWTManager
from flask_mail import Mail

db = MySQL()
jwt = JWTManager()
mail = Mail()

