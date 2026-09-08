from .base import *  # noqa

DEBUG = True

CORS_ALLOW_ALL_ORIGINS = True  # Allow Expo dev on any port in local dev

ALLOWED_HOSTS = ['*']

# Use local disk for media in dev — no Cloudinary creds needed
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'