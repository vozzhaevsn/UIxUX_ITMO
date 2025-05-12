import os

class Config:
    basedir = os.path.abspath(os.path.dirname(__file__))
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(basedir, "instance/site.db")}'
    SECRET_KEY = 'fce7a60125938174f447756860b0487822be0452b76dcda2'  # Замените на случайную строку!
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(os.path.abspath(os.path.dirname(__file__)), 'instance', 'site.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    MAIL_SERVER = 'smtp.yandex.ru'  # Пример для Яндекс.Почты
    MAIL_PORT = 465
    MAIL_USE_SSL = True
    MAIL_USERNAME = 'ваш@yandex.ru'
    MAIL_PASSWORD = 'пароль_от_почты'