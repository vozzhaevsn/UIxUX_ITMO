from flask import (Blueprint, current_app, render_template, redirect, 
                   url_for, flash, request)
from flask_login import login_user, logout_user, login_required, current_user
from flask_mail import Message
from . import db, mail
from .models import User, Car, Configuration, Order
from .forms import (RegistrationForm, LoginForm, 
                    ResetPasswordForm, ConfigurationForm, OrderForm)


bp = Blueprint('main', __name__)


@bp.route('/')
def index():
    return render_template('index.html')

@bp.route('/register', methods=['GET', 'POST'])
def register():
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(
            username=form.username.data,
            email=form.email.data,
            phone=form.phone.data
        )
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        flash('Регистрация прошла успешно! Теперь можете войти.', 'success')
        return redirect(url_for('main.login'))
    return render_template('register.html', form=form)

@bp.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter(
            (User.email == form.email_or_phone.data) | 
            (User.phone == form.email_or_phone.data)
        ).first()
        
        if user and user.check_password(form.password.data):
            login_user(user, remember=form.remember.data)
            return redirect(url_for('main.catalog'))
        flash('Неверный email/телефон или пароль', 'danger')
    return render_template('login.html', form=form)

@bp.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Вы успешно вышли из системы', 'success')
    return redirect(url_for('main.index'))

@bp.route('/catalog')
@login_required
def catalog():
    cars = Car.query.all()
    return render_template('catalog.html', cars=cars)

@bp.route('/configure/<int:car_id>', methods=['GET', 'POST'])
@login_required
def configure(car_id):
    car = Car.query.get_or_404(car_id)
    form = ConfigurationForm()
    
    if form.validate_on_submit():
        config = Configuration(
            color=form.color.data,
            climate_control=form.climate_control.data,
            multimedia=form.multimedia.data,
            car_id=car.id
        )
        db.session.add(config)
        db.session.commit()
        return redirect(url_for('main.order', 
                               car_id=car.id, 
                               config_id=config.id))
    return render_template('configure.html', car=car, form=form)

@bp.route('/reset_password', methods=['GET', 'POST'])
def reset_password():
    form = ResetPasswordForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user:
            # Логика отправки письма (реализуйте позже)
            flash('Инструкции отправлены на ваш email', 'info')
            return redirect(url_for('main.login'))
        else:
            flash('Email не найден', 'danger')
    return render_template('reset_password.html', form=form)

@bp.route('/order/<int:car_id>/<int:config_id>', methods=['GET', 'POST'])
@login_required
def order(car_id, config_id):
    try:
        car = Car.query.get_or_404(car_id)
        config = Configuration.query.get_or_404(config_id)
        form = OrderForm()
        
        if form.validate_on_submit():
            new_order = Order(
                address=form.address.data,
                payment_method=form.payment_method.data,
                user_id=current_user.id,
                car_id=car.id,
                config_id=config.id
            )
            db.session.add(new_order)
            db.session.commit()

            # Отправка email
            msg = Message(
                "Подтверждение заказа",
                sender=current_app.config['MAIL_USERNAME'],
                recipients=[current_user.email],
                charset='utf-8'
            )
            msg.body = f"""
            Детали заказа #{new_order.id}:
            Модель: {car.model}
            Цвет: {config.color}
            Адрес доставки: {new_order.address}
            """
            
            try:
                mail.send(msg)
                flash('Заказ оформлен! Подробности отправлены на ваш email.', 'success')
            except Exception as e:
                current_app.logger.error(f"Ошибка отправки email: {str(e)}")
                flash('Заказ оформлен, но не удалось отправить подтверждение', 'warning')

            return redirect(url_for('main.index'))
        
        # Добавлен возврат шаблона при GET-запросе
        return render_template('order.html', 
                             car=car, 
                             config=config, 
                             form=form)
    
    except Exception as e:
        current_app.logger.error(f"Ошибка оформления заказа: {str(e)}")
        flash('Произошла ошибка при оформлении заказа', 'danger')
        return redirect(url_for('main.catalog'))