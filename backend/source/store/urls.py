from django.urls import path

from . import views

app_name = 'store'

urlpatterns = [
	path('', views.product_list, name='product_list'),
	path('cart/', views.cart_detail, name='cart'),
	path('cart/items/<int:item_id>/update/', views.update_cart_item, name='update_cart_item'),
	path('cart/items/<int:item_id>/remove/', views.remove_cart_item, name='remove_cart_item'),
	path('<slug:slug>/', views.product_detail, name='product_detail'),
]