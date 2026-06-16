from django.urls import path
from . import views

app_name = 'game'

urlpatterns = [
    path('', views.game_page, name='game_page'),
    path('api/bootstrap/', views.bootstrap_api, name='bootstrap_api'),
    path('api/save/', views.save_api, name='save_api'),
    path('api/reset/', views.reset_api, name='reset_api'),
]
