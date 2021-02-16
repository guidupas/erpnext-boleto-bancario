# -*- coding: utf-8 -*-
# Copyright (c) 2021, Inova Techy and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from boleto_bancario.boleto_bancario.gerencianet import Gerencianet
from erpnext.accounts.doctype.payment_entry.payment_entry import get_payment_entry

class BoletosEmitidos(Document):
	pass

def retorna_boleto_gerencianet_cpf(
	item,
	valor,
	qtde,
	data_vencimento,
	nome_cliente,
	numero_documento,
	email_cliente,
	telefone_cliente
	):
	body = ''
	
	if(email_cliente == ''):
		body = {
			'items': [{
			'name': item,
			'value': int(valor),
			'amount': int(qtde)
			}],
			'payment': {
				'banking_billet': {
					'expire_at': data_vencimento,
					'customer': {
						'name': nome_cliente,
						'cpf': numero_documento,
						'phone_number': telefone_cliente
					}
				}   
			}
		}
	else:
		body = {
			'items': [{
			'name': item,
			'value': int(valor),
			'amount': int(qtde)
			}],
			'payment': {
				'banking_billet': {
					'expire_at': data_vencimento,
					'customer': {
						'name': nome_cliente,
						'email': email_cliente,
						'cpf': numero_documento,
						'phone_number': telefone_cliente
					}
				}   
			}
		}

	return body

def retorna_boleto_gerencianet_cnpj(
	item,
	valor,
	qtde,
	data_vencimento,
	nome_cliente,
	numero_documento,
	email_cliente,
	telefone_cliente
	):
	body = ''
	
	if(email_cliente == ''):
		body = {
			'items': [{
			'name': item,
			'value': int(valor),
			'amount': int(qtde)
			}],
			'payment': {
				'banking_billet': {
					'expire_at': data_vencimento,
					'customer': {
						'phone_number': telefone_cliente,
						'juridical_person': {
							'corporate_name': nome_cliente,
							'cnpj': numero_documento
						}
					}
				}   
			}
		}
	else:
		body = {
			'items': [{
			'name': item,
			'value': int(valor),
			'amount': int(qtde)
			}],
			'payment': {
				'banking_billet': {
					'expire_at': data_vencimento,
					'customer': {
						'email': email_cliente,
						'phone_number': telefone_cliente,
						'juridical_person': {
							'corporate_name': nome_cliente,
							'cnpj': numero_documento
						}
					}
				}   
			}
		}

	return body


@frappe.whitelist()
def gerar_boleto_gerencianet(
	client_id,
	client_secret,
	item,
	valor,
	qtde,
	data_vencimento,
	cnpj_bool,
	nome_cliente,
	numero_documento,
	email_cliente,
	telefone_cliente
	):
	credentials = {
		'client_id': client_id,
		'client_secret': client_secret
	}

	gn = Gerencianet(credentials)
	
	body = ''
	if (cnpj_bool == 'true'):
		body = retorna_boleto_gerencianet_cnpj(item, valor,	qtde, data_vencimento, nome_cliente, numero_documento, email_cliente, telefone_cliente)
	else:
		body = retorna_boleto_gerencianet_cpf(item, valor,	qtde, data_vencimento, nome_cliente, numero_documento, email_cliente, telefone_cliente)
	
	response = gn.create_charge_onestep(params=None, body=body)
	
	return response

@frappe.whitelist()
def realizar_cancelamento_boleto(client_id, client_secret, codigo_cobranca, name):
	doc_boleto = frappe.get_doc('Boletos Emitidos', name)

	doc_boleto_atualizado = atualizar_situacao_boleto(client_id, client_secret, doc_boleto)
	
	busca_situacao_boleto = ['Pendente', 'Não pago', 'Vencido']
	
	if(doc_boleto_atualizado.situacao in busca_situacao_boleto):
		return cancelar_boleto(client_id, client_secret, doc_boleto_atualizado)

@frappe.whitelist()
def realizar_atualizacao_boleto(client_id, client_secret, codigo_cobranca, name):
	doc_boleto = frappe.get_doc('Boletos Emitidos', name)

	doc_boleto_atualizado = atualizar_situacao_boleto(client_id, client_secret, doc_boleto)

	if(doc_boleto_atualizado.situacao == 'Pago' or doc_boleto_atualizado.situacao == 'Marcado como pago' ):
		pagar_boleto(doc_boleto_atualizado)

@frappe.whitelist()
def atualizar_situacao_boleto(client_id, client_secret, doc_boleto):
	credentials = {
		'client_id': client_id,
		'client_secret': client_secret
	}

	gn = Gerencianet(credentials)

	params = {
		'id': doc_boleto.codigo_cobranca
	}

	response =  gn.detail_charge(params=params)
	
	if(response.get('data').get('status') == 'waiting'):
		doc_boleto.situacao = 'Pendente'
	elif(response.get('data').get('status') == 'paid'):
		doc_boleto.situacao = 'Pago'
		doc_boleto.data_pagamento = response.get('data').get('history')[-1].get('created_at')
	elif(response.get('data').get('status') == 'unpaid'):
		doc_boleto.situacao = 'Não pago'
	elif(response.get('data').get('status') == 'refunded'):
		doc_boleto.situacao = 'Devolvido'
	elif(response.get('data').get('status') == 'contested'):
		doc_boleto.situacao = 'Contestado'
	elif(response.get('data').get('status') == 'canceled'):
		doc_boleto.situacao = 'Cancelado'
		doc_boleto.docstatus = 2
	elif(response.get('data').get('status') == 'settled'):
		doc_boleto.situacao = 'Marcado como pago'
		doc_boleto.data_pagamento = response.get('data').get('history')[-1].get('created_at')
	else:
		doc_boleto.situacao = 'Vencido'

	doc_boleto.save()
	
	return doc_boleto

@frappe.whitelist()
def cancelar_boleto(client_id, client_secret, doc_boleto):
	credentials = {
		'client_id': client_id,
		'client_secret': client_secret
	}

	gn = Gerencianet(credentials)

	params = {
		'id': doc_boleto.codigo_cobranca
	}

	response = gn.cancel_charge(params=params)

	return response.get('code')

@frappe.whitelist()
def pagar_boleto(doc_boleto):
	pagamento = get_payment_entry('Sales Invoice', doc_boleto.fatura, doc_boleto.valor)
	pagamento.reference_no = doc_boleto.codigo_cobranca
	pagamento.reference_date = doc_boleto.data_pagamento
	pagamento.insert()