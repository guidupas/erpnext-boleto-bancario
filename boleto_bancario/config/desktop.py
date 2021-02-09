# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from frappe import _

def get_data():
	return [
		{
			"module_name": "Boleto Bancario",
			"color": "grey",
			"icon": "fa fa-barcode",
			"type": "module",
			"label": _("Boleto Bancário")
		}
	]
