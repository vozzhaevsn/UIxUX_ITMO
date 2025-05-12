from flask_wtf import FlaskForm
from wtforms import SelectField, StringField, PasswordField, SubmitField, BooleanField, TextAreaField
from wtforms.validators import DataRequired, Email, EqualTo, ValidationError
from .models import User

class RegistrationForm(FlaskForm):
    username = StringField('Имя', validators=[DataRequired()])
    email = StringField('Email', validators=[DataRequired(), Email()])
    phone = StringField('Телефон', validators=[DataRequired()])
    password = PasswordField('Пароль', validators=[DataRequired()])
    confirm_password = PasswordField('Подтвердите пароль', 
                                   validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Зарегистрироваться')

    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user:
            raise ValidationError('Этот email уже зарегистрирован')

    def validate_phone(self, phone):
        user = User.query.filter_by(phone=phone.data).first()
        if user:
            raise ValidationError('Этот телефон уже зарегистрирован')

class LoginForm(FlaskForm):
    email_or_phone = StringField('Email/Телефон', validators=[DataRequired()])
    password = PasswordField('Пароль', validators=[DataRequired()])
    remember = BooleanField('Запомнить меня')
    submit = SubmitField('Войти')

class ResetPasswordForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    submit = SubmitField('Сбросить пароль')

class ConfigurationForm(FlaskForm):
    color = SelectField('Цвет', choices=[
        ('white', 'Белый'),
        ('black', 'Черный'),
        ('silver', 'Серебристый')
    ], validators=[DataRequired()])
    climate_control = BooleanField('Климат-контроль (+50 000 ₽)')
    multimedia = BooleanField('Премиум аудиосистема (+75 000 ₽)')
    submit = SubmitField('Продолжить')

class OrderForm(FlaskForm):
    address = TextAreaField('Адрес доставки', validators=[DataRequired()])
    payment_method = SelectField('Способ оплаты', choices=[
        ('cash', 'Наличные'),
        ('credit', 'Кредит')
    ], validators=[DataRequired()])
    submit = SubmitField('Оформить заказ')