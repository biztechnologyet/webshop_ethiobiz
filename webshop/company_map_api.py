import json
import os
import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def setup_company_map_fields():
    """Adds GPS and location fields to Company DocType for WebShop Map View."""
    custom_fields = {
        "Company": [
            {
                "fieldname": "location_section",
                "fieldtype": "Section Break",
                "label": "WebShop Map & Location",
                "insert_after": "domain",
                "collapsible": 1
            },
            {
                "fieldname": "show_on_map",
                "fieldtype": "Check",
                "label": "Show on WebShop Map",
                "default": "1",
                "insert_after": "location_section",
                "in_list_view": 1,
                "in_standard_filter": 1
            },
            {
                "fieldname": "business_category",
                "fieldtype": "Select",
                "label": "Business Category",
                "options": "\nHotel & Lodging\nRestaurant & Cafe\nRetail & Supermarket\nSalon & Beauty\nClinic & Healthcare\nReal Estate & Property\nIT & Professional Services\nOther",
                "insert_after": "show_on_map",
                "in_list_view": 1,
                "in_standard_filter": 1
            },
            {
                "fieldname": "col_break_loc1",
                "fieldtype": "Column Break",
                "insert_after": "business_category"
            },
            {
                "fieldname": "latitude",
                "fieldtype": "Float",
                "label": "Latitude",
                "precision": "7",
                "insert_after": "col_break_loc1"
            },
            {
                "fieldname": "longitude",
                "fieldtype": "Float",
                "label": "Longitude",
                "precision": "7",
                "insert_after": "latitude"
            },
            {
                "fieldname": "gps_accuracy",
                "fieldtype": "Float",
                "label": "GPS Accuracy (Meters)",
                "read_only": 1,
                "insert_after": "longitude"
            },
            {
                "fieldname": "sec_break_loc2",
                "fieldtype": "Section Break",
                "insert_after": "gps_accuracy"
            },
            {
                "fieldname": "location_address",
                "fieldtype": "Small Text",
                "label": "Location Description / Landmark",
                "insert_after": "sec_break_loc2"
            },
            {
                "fieldname": "map_location",
                "fieldtype": "Geolocation",
                "label": "Map Pin Location",
                "insert_after": "location_address"
            }
        ]
    }
    create_custom_fields(custom_fields, update=True)
    frappe.db.commit()
    print("Company GPS and location custom fields created successfully!")

@frappe.whitelist(allow_guest=True)
def get_company_locations(category=None, user_lat=None, user_lng=None, radius_km=None):
    """Whitelisted API endpoint to return active company locations for the WebShop Map View."""
    filters = {"show_on_map": 1}
    if category and category.strip():
        filters["business_category"] = category.strip()

    companies = frappe.get_all(
        "Company",
        filters=filters,
        fields=[
            "name", "company_name", "company_description", "business_category",
            "latitude", "longitude", "gps_accuracy", "location_address",
            "phone_no", "email", "website", "company_logo"
        ]
    )

    valid_locations = []
    for comp in companies:
        lat = comp.get("latitude")
        lng = comp.get("longitude")
        
        # Default Addis Ababa fallback if lat/lng is 0 or None for testing
        if not lat or not lng or (lat == 0 and lng == 0):
            continue

        valid_locations.append({
            "id": comp.name,
            "name": comp.company_name or comp.name,
            "category": comp.business_category or "Other",
            "lat": float(lat),
            "lng": float(lng),
            "accuracy": comp.gps_accuracy or 0,
            "address": comp.location_address or "",
            "phone": comp.phone_no or "",
            "email": comp.email or "",
            "website": comp.website or "",
            "logo": comp.company_logo or "/assets/frappe/images/default-avatar.png",
            "shop_url": f"/shop?company={comp.name}"
        })

    return {
        "status": "success",
        "total": len(valid_locations),
        "companies": valid_locations
    }
