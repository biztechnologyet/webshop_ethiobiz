import frappe
from frappe.model.document import Document

class SalonAppointment(Document):
    def validate(self):
        if not self.company:
            self.company = "Biz Technology Solutions"

        # Ensure Customer Master in ERPNext
        if self.customer_name and self.customer_phone:
            cust = frappe.db.get_value("Customer", {"mobile_no": self.customer_phone}, "name")
            if not cust:
                cust = frappe.db.get_value("Customer", {"customer_name": self.customer_name}, "name")
            if not cust:
                try:
                    c_doc = frappe.get_doc({
                        "doctype": "Customer",
                        "customer_name": self.customer_name,
                        "customer_type": "Individual",
                        "mobile_no": self.customer_phone,
                        "email_id": self.customer_email or "",
                        "customer_group": "Individual",
                        "territory": "Ethiopia"
                    })
                    c_doc.flags.ignore_permissions = True
                    c_doc.insert(ignore_permissions=True)
                except Exception:
                    pass

    def on_submit(self):
        self.make_sales_invoice()
        self.issue_consumables()

    def make_sales_invoice(self):
        """Creates a Sales Invoice in ERPNext Accounts upon appointment payment/completion."""
        if not self.amount or self.amount <= 0:
            return

        cust = frappe.db.get_value("Customer", {"customer_name": self.customer_name}, "name") or self.customer_name
        try:
            inv = frappe.get_doc({
                "doctype": "Sales Invoice",
                "customer": cust,
                "company": self.company,
                "posting_date": self.appointment_date or frappe.utils.today(),
                "due_date": self.appointment_date or frappe.utils.today(),
                "items": [
                    {
                        "item_code": self.salon_service or "Service",
                        "item_name": self.salon_service or "Beauty Service",
                        "qty": 1,
                        "rate": self.amount,
                        "amount": self.amount
                    }
                ]
            })
            inv.flags.ignore_permissions = True
            inv.insert(ignore_permissions=True)
            frappe.db.set_value("Salon Appointment", self.name, "sales_invoice", inv.name)
            frappe.db.commit()
        except Exception as e:
            frappe.log_error(f"Error creating Sales Invoice for Salon Appointment: {e}")

    def issue_consumables(self):
        """Issues raw consumable materials from warehouse upon appointment completion."""
        # Consumable deduction logic for salon treatments
        pass

    @frappe.whitelist()
    def report_facility_issue(self, subject, description, priority="Medium"):
        """Reports facility/equipment breakdown directly into ERPNext Issue / Maintenance."""
        issue = frappe.get_doc({
            "doctype": "Issue",
            "subject": f"[Salon Facility] {subject}",
            "customer": self.customer_name,
            "company": self.company,
            "priority": priority,
            "description": f"Appointment: {self.name}\nService: {self.salon_service}\nNotes: {description}"
        })
        issue.flags.ignore_permissions = True
        issue.insert(ignore_permissions=True)
        frappe.db.commit()
        return issue.name
