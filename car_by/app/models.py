from datetime import datetime
from app import db, login_manager
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    orders = db.relationship('Order', backref='customer', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Car(db.Model):
    __tablename__ = 'cars'
    id = db.Column(db.Integer, primary_key=True)
    model = db.Column(db.String(100), nullable=False)
    base_price = db.Column(db.Float, nullable=False)
    engine = db.Column(db.String(50))
    body_type = db.Column(db.String(50))
    image = db.Column(db.String(100))
    configurations = db.relationship('Configuration', backref='car', lazy=True)
    orders = db.relationship('Order', backref='ordered_car', lazy=True)

class Configuration(db.Model):
    __tablename__ = 'configurations'
    id = db.Column(db.Integer, primary_key=True)
    color = db.Column(db.String(30), nullable=False)
    climate_control = db.Column(db.Boolean, default=False)
    multimedia = db.Column(db.Boolean, default=False)
    car_id = db.Column(db.Integer, db.ForeignKey('cars.id'), nullable=False)
    orders = db.relationship('Order', backref='configuration', lazy=True)

class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.Integer, primary_key=True)
    address = db.Column(db.Text, nullable=False)
    payment_method = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    car_id = db.Column(db.Integer, db.ForeignKey('cars.id'), nullable=False)
    config_id = db.Column(db.Integer, db.ForeignKey('configurations.id'), nullable=False)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))