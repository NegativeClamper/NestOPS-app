from .base import *  # noqa
from decouple import config

DEBUG = False

SECRET_KEY = config("SECRET_KEY")

# Add your production domain here
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="").split(",")

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
