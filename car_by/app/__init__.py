import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_mail import Mail

db = SQLAlchemy()
login_manager = LoginManager()
mail = Mail()

def create_app():
    app = Flask(__name__, template_folder='templates')
    app.config.from_object('config.Config')

    # Создаем папку instance если ее нет
    if not os.path.exists(os.path.join(app.root_path, 'instance')):
        os.makedirs(os.path.join(app.root_path, 'instance'))

    # Инициализация расширений
    db.init_app(app)
    login_manager.init_app(app)
    mail.init_app(app)
    
    # Регистрация Blueprint должна быть ПЕРЕД созданием контекста
    from .routes import bp
    app.register_blueprint(bp)
    
    # Создание таблиц и тестовых данных
    with app.app_context():
        db.create_all()
        initialize_data(app)
        
    return app

def initialize_data(app):
    """Инициализация тестовых данных"""
    from .models import Car, Configuration
    
    if not Car.query.first():
        cars = [
            Car(
                model="Седан Стандарт",
                base_price=1_200_000,
                engine="1.6L Turbo",
                body_type="Седан",
                image="sedan.jpg"
            ),
            Car(
                model="Кроссовер Премиум",
                base_price=1_800_000,
                engine="2.0L Hybrid",
                body_type="Кроссовер",
                image="crossover.jpg"
            )
        ]
        
        for car in cars:
            db.session.add(car)
            db.session.add(Configuration(
                color="white",
                climate_control=False,
                multimedia=False,
                car=car
            ))
            
        db.session.commit()