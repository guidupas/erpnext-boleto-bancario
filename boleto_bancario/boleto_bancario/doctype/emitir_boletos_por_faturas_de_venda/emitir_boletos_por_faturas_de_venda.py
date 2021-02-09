# -*- coding: utf-8 -*-
# Copyright (c) 2021, Inova Techy and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from gerencianet import Gerencianet

class EmitirBoletosporFaturasdeVenda(Document):
	pass

@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def filtrar_faturas_child_table(doctype, txt, searchfield, start, page_len, filters):
	return frappe.db.sql(
		"""
		SELECT tsi.name, tsi.posting_date, tsi.due_date, tsi.customer, tsi.customer_name, tsi.outstanding_amount
		FROM `tabSales Invoice` tsi
		LEFT JOIN `tabFaturas de Boletos por Fatura de Venda` tfdbpfdv
		ON
		tsi.name = tfdbpfdv.fatura
		WHERE
		tfdbpfdv.fatura IS NULL
		AND
		tsi.status = 'Unpaid'
		AND
		tsi.docstatus = 1
		AND
		(tsi.customer LIKE '%%%(txt)s%%' OR tsi.name LIKE '%%%(txt)s%%')
		AND
		tsi.company = '%(company)s'
		""" % {
				'txt': txt,
				'company': filters.get('company')}
	)

@frappe.whitelist()
def filtrar_faturas_multiselect_dialog(doctype, txt, searchfield, start, page_len, filters):
	if filters.get('posting_date'):
		return frappe.db.sql(
			"""
			SELECT tsi.name, tsi.posting_date, tsi.due_date, tsi.customer, tsi.customer_name, tsi.outstanding_amount
			FROM `tabSales Invoice` tsi
			LEFT JOIN `tabFaturas de Boletos por Fatura de Venda` tfdbpfdv
			ON
			tsi.name = tfdbpfdv.fatura
			WHERE
			tfdbpfdv.fatura IS NULL
			AND
			tsi.status = 'Unpaid'
			AND
			tsi.docstatus = 1
			AND
			(tsi.customer LIKE '%%%(customer)s%%' AND tsi.name LIKE '%%%(txt)s%%' AND tsi.posting_date BETWEEN '%(posting_date_inicio)s' AND '%(posting_date_fim)s')
			AND
			tsi.company = '%(company)s'
			""" % {
				'customer': filters.get('customer', ''),
				'posting_date_inicio': filters.get('posting_date')[1][0],
				'posting_date_fim': filters.get('posting_date')[1][1],
				'txt': txt,
				'company': filters.get('company')}, as_dict = True)
	else:
		return frappe.db.sql(
			"""
			SELECT tsi.name, tsi.posting_date, tsi.due_date, tsi.customer, tsi.customer_name, tsi.outstanding_amount
			FROM `tabSales Invoice` tsi
			LEFT JOIN `tabFaturas de Boletos por Fatura de Venda` tfdbpfdv
			ON
			tsi.name = tfdbpfdv.fatura
			WHERE
			tfdbpfdv.fatura IS NULL
			AND
			tsi.status = 'Unpaid'
			AND
			tsi.docstatus = 1
			AND
			(tsi.customer LIKE '%%%(customer)s%%' AND tsi.name LIKE '%%%(txt)s%%')
			AND
			tsi.company = '%(company)s'
			""" % {
				'customer': filters.get('customer', ''),
				'txt': txt,
				'company': filters.get('company')}, as_dict = True)
