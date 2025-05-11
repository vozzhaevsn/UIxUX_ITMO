from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager

db = SQLAlchemy()
login_manager = LoginManager()

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')
    from .routes import bp
    app.register_blueprint(bp)

    db.init_app(app)
    login_manager.init_app(app)
    
    # Импортируем маршруты ПОСЛЕ инициализации расширений
    with app.app_context():
        from . import routes
        db.create_all()
        
    return app