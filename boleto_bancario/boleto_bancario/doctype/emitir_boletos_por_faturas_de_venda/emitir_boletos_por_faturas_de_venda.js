// Copyright (c) 2021, Inova Techy and contributors
// For license information, please see license.txt


frappe.ui.form.on('Emitir Boletos por Faturas de Venda', {
	onload(frm) {
		atualiza_query_fatura(frm);
	},

	refresh: function(frm) {
		if(frm.doc.docstatus == 0) {
			frm.add_custom_button(__('Selecionar faturas'), function() {
				mostra_seleciona_fatura_multiselect(frm);
			});
		}
	},

	before_submit: function(frm) {
		var vencimentos_invalidos = new Set();
		var faturas_canceladas = new Set();
		var telefones_invalidos = new Set();
		var documentos_invalidos = new Set();
		var emails_invalidos = new Set();

		frm.doc.faturas_selecionadas.forEach(function(fatura_item) {
			var argumentos_retorno_doc = {
				doctype: 'Sales Invoice',
				name: fatura_item.fatura,
			};
			
			var doc_fatura = retorna_doc(argumentos_retorno_doc);
						
			if(doc_fatura.docstatus === 2) {
				faturas_canceladas.add(doc_fatura.name);
			}
			
			doc_fatura.payment_schedule.forEach(function(item_agenda){
				if(frappe.datetime.get_day_diff(item_agenda.due_date, frappe.datetime.now_date()) <= 0) {
					vencimentos_invalidos.add(doc_fatura.name);
				}
			})

			const valida_telefone_regex = /^[1-9]{2}9?[0-9]{8}$/;
			if(!valida_telefone_regex.test(fatura_item.telefone.replace(/[\-+./()\s]/g, ''))) {
				telefones_invalidos.add(doc_fatura.name);
			}

			if(fatura_item.email && !frappe.utils.validate_type(fatura_item.email, 'email')) {
				emails_invalidos.add(doc_fatura.name);
			}

			if(fatura_item.tipo_cliente == 'Pessoa Física') {
				if(fatura_item.cpfcnpj.replace(/[\-+./()\s]/g, '').length == 11) {
					if(!verificarCPF(fatura_item.cpfcnpj.replace(/[\-+./()\s]/g, ''))) {
						documentos_invalidos.add(doc_fatura.name)
					}
				} else {
					documentos_invalidos.add(doc_fatura.name)
				}
			} else {
				if(fatura_item.cpfcnpj.replace(/[\-+./()\s]/g, '').length == 14) {
					if(!verificarCNPJ(fatura_item.cpfcnpj.replace(/[\-+./()\s]/g, ''))) {
						documentos_invalidos.add(doc_fatura.name)
					}
				} else {
					documentos_invalidos.add(doc_fatura.name)
				}
			}
		})
		
		if(faturas_canceladas.size > 0) {
			var mensagem = 'Há fatura(s) cancelada(s) na lista de faturas: '
			
			var count = 0;
			faturas_canceladas.forEach(function(cancelada){
				mensagem = mensagem + cancelada;
				if (count !== faturas_canceladas.size - 1){
					mensagem = mensagem + ', ';
				}
				count++;
			})

			frappe.msgprint({
				title: __('Aviso'),
				indicator: 'red',
				message: __(mensagem)
			});

			frappe.validated = false;
		} else if(vencimentos_invalidos.size > 0) {
			var mensagem = 'Data(s) de vencimento inválida(s) na(s) fatura(s):<br/>'
			
			var count = 0;
			vencimentos_invalidos.forEach(function(vencimento){
				mensagem = mensagem + vencimento;
				if (count !== vencimentos_invalidos.size - 1){
					mensagem = mensagem + '<br/>';
				}
				count++;
			})

			frappe.msgprint({
				title: __('Aviso'),
				indicator: 'red',
				message: __(mensagem)
			});

			frappe.validated = false;
		} else if(telefones_invalidos.size > 0) {
			var mensagem = 'Telefone(s) inválido(s) na(s) fatura(s):<br/>'
			
			var count = 0;
			telefones_invalidos.forEach(function(telefone){
				mensagem = mensagem + telefone;
				if (count !== telefones_invalidos.size - 1){
					mensagem = mensagem + '<br/>';
				}
				count++;
			})

			frappe.msgprint({
				title: __('Aviso'),
				indicator: 'red',
				message: __(mensagem)
			});

			frappe.validated = false;
		} else if(emails_invalidos.size > 0) {
			var mensagem = 'E-mail(s) inválido(s) na(s) fatura(s):<br/>'
			
			var count = 0;
			emails_invalidos.forEach(function(email){
				mensagem = mensagem + email;
				if (count !== emails_invalidos.size - 1){
					mensagem = mensagem + '<br/>';
				}
				count++;
			})

			frappe.msgprint({
				title: __('Aviso'),
				indicator: 'red',
				message: __(mensagem)
			});

			frappe.validated = false;
		} else if(documentos_invalidos.size > 0) {
			var mensagem = 'CPF(s) ou CNPJ(s) inválido(s) na(s) fatura(s):<br/>'
			
			var count = 0;
			documentos_invalidos.forEach(function(documento){
				mensagem = mensagem + documento;
				if (count !== documentos_invalidos.size - 1){
					mensagem = mensagem + '<br/>';
				}
				count++;
			})

			frappe.msgprint({
				title: __('Aviso'),
				indicator: 'red',
				message: __(mensagem)
			});

			frappe.validated = false;
		} else if(retorna_conf_plataforma_emissora(frm.doc.plataforma_emissora) == null) {
			frappe.msgprint({
				title: __('Aviso'),
				indicator: 'red',
				message: __('Plataforma de emissão de boletos ' + frm.doc.plataforma_emissora + ' não configurada')
			});
			
			frappe.validated = false;
		} else {
			if(frm.doc.plataforma_emissora == 'Gerencianet') {
				var conf_gerencianet = retorna_conf_plataforma_emissora(frm.doc.plataforma_emissora);
				frm.doc.faturas_selecionadas.forEach(function(fatura_item) {
					var argumentos_retorno_doc = {
						doctype: 'Sales Invoice',
						name: fatura_item.fatura,
					};
					
					var doc_fatura = retorna_doc(argumentos_retorno_doc);

					doc_fatura.payment_schedule.forEach(function(item_agenda, idx, array){
						var boleto_item = 'Código da fatura: ' + doc_fatura.name;
						if(doc_fatura.payment_schedule.length > 1) {
							boleto_item = 'Código da fatura: ' + doc_fatura.name + ' - Parcela ' + (idx + 1) + ' de ' + array.length;
						}

						var valor_gerencianet = item_agenda.payment_amount.toFixed(2) * 100;
						
						var cnpj_bool = true;
						if(fatura_item.tipo_cliente == 'Pessoa Física') {
							cnpj_bool = false;
						}
						
						var parcela = idx + 1;
						var valor = item_agenda.payment_amount;
						
						gerar_boleto_gerencianet(
							conf_gerencianet.client_id,
							conf_gerencianet.client_secret,
							boleto_item,
							valor_gerencianet,
							1,
							item_agenda.due_date,
							cnpj_bool,
							fatura_item.cliente,
							fatura_item.cpfcnpj.replace(/[\-+./()\s]/g, ''),
							fatura_item.email || '',
							fatura_item.telefone.replace(/[\-+./()\s]/g, ''),
							doc_fatura.name,
							frm.doc.name,
							parcela,
							valor
						);
					})
				})
			}
		}
	},
	before_cancel: function(frm) {
		var busca_situacao_boleto = ['Pendente', 'Não pago', 'Vencido'];
		
		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: 'Boletos Emitidos',
				fields: [
					'name',
					'codigo_cobranca'
				],
				filters: [
					['Boletos Emitidos', 'emissao_fatura_venda', '=', frm.doc.name],
					['Boletos Emitidos', 'situacao', 'IN', busca_situacao_boleto]
				],
				limit_page_length: 0,
				as_list: true,
			},
			async: true,
			freeze: true,
			freeze_message: 'Aguarde<br/>Atualizando situação dos boletos<br/>Este processo pode demorar alguns minutos',
			callback(r) {
				if(r.message) {
					realizar_cancelamento_boleto(frm, r.message);
				}
			}
		});
	}
});

frappe.ui.form.on('Faturas de Boletos por Fatura de Venda', {
	faturas_selecionadas_remove(frm, cdt, cdn) {
		frm.doc.valor_boletos = calcula_valor_total_boletos(frm.doc);
		frm.refresh_field('valor_boletos');
	},

	fatura(frm, cdt, cdn) {
		var linha_fatura_selecionada = locals[cdt][cdn];
		var indice_fatura = linha_fatura_selecionada.idx - 1;
		var fatura = linha_fatura_selecionada.fatura;

		if(linha_fatura_selecionada.fatura) {
			if(verifica_fatura_selecionada_duplicada(frm, indice_fatura, fatura)) {
				frappe.model.set_value(linha_fatura_selecionada.doctype, linha_fatura_selecionada.name, 'fatura', '');
				frappe.model.set_value(linha_fatura_selecionada.doctype, linha_fatura_selecionada.name, 'valor', '');
				frappe.model.set_value(linha_fatura_selecionada.doctype, linha_fatura_selecionada.name, 'cliente', '');
				frappe.model.set_value(linha_fatura_selecionada.doctype, linha_fatura_selecionada.name, 'cpfcnpj', '');
				frappe.model.set_value(linha_fatura_selecionada.doctype, linha_fatura_selecionada.name, 'telefone', '');
				frappe.model.set_value(linha_fatura_selecionada.doctype, linha_fatura_selecionada.name, 'email', '');
				frappe.model.set_value(linha_fatura_selecionada.doctype, linha_fatura_selecionada.name, 'tipo_cliente', '');
				frappe.model.set_value(linha_fatura_selecionada.doctype, linha_fatura_selecionada.name, 'parcelas', 1);

				refresh_field('fatura');
				refresh_field('valor');
				refresh_field('cliente');
				refresh_field('cpfcnpj');
				refresh_field('telefone');
				refresh_field('email');
				refresh_field('tipo_cliente');
				refresh_field('parcelas');

				frappe.msgprint({
					title: __('Aviso'),
					indicator: 'red',
					message: __('A fatura já existe na lista')
				});
			} else {
				var argumentos_retorno_fatura_doc = {
					doctype: 'Sales Invoice',
					name: linha_fatura_selecionada.fatura,
				};
				
				var doc_fatura = retorna_doc(argumentos_retorno_fatura_doc);
		
				var argumentos_retorno_cliente_doc = {
					doctype: 'Customer',
					name: doc_fatura.customer,
				};
		
				var doc_cliente = retorna_doc(argumentos_retorno_cliente_doc);
		
				frappe.model.set_value(linha_fatura_selecionada.doctype, linha_fatura_selecionada.name, 'valor', doc_fatura.outstanding_amount);
				frappe.model.set_value(linha_fatura_selecionada.doctype, linha_fatura_selecionada.name, 'cliente', doc_fatura.customer);
				frappe.model.set_value(linha_fatura_selecionada.doctype, linha_fatura_selecionada.name, 'cpfcnpj', doc_cliente.tax_id);
				frappe.model.set_value(linha_fatura_selecionada.doctype, linha_fatura_selecionada.name, 'telefone', doc_cliente.mobile_no);
				frappe.model.set_value(linha_fatura_selecionada.doctype, linha_fatura_selecionada.name, 'email', doc_cliente.email_id);
		
				if(doc_cliente.customer_type == 'Company') {
					frappe.model.set_value(linha_fatura_selecionada.doctype, linha_fatura_selecionada.name, 'tipo_cliente', 'Pessoa Jurídica');
				} else {
					frappe.model.set_value(linha_fatura_selecionada.doctype, linha_fatura_selecionada.name, 'tipo_cliente', 'Pessoa Física');
				}
		
				if(doc_fatura.net_total == doc_fatura.outstanding_amount) {
					frappe.model.set_value(linha_fatura_selecionada.doctype, linha_fatura_selecionada.name, 'parcelas', doc_fatura.payment_schedule.length);
					refresh_field('parcelas');
				}
				
				refresh_field('valor');
				refresh_field('customer');
				refresh_field('cpfcnpj');
				refresh_field('tipo_cliente');
				refresh_field('telefone');
				refresh_field('email');
		
				frm.doc.valor_boletos = calcula_valor_total_boletos(frm.doc);
				frm.refresh_field('valor_boletos');
			}
		}
	}
});

function retorna_conf_plataforma_emissora(plataforma_emissora) {
	var retorno = null;

	if(plataforma_emissora == "Gerencianet") {
		var argumentos_retorno_doc = {
			doctype: 'Configurar Plataforma Gerencianet',
		};
		
		var doc_conf_gerencianet = retorna_doc(argumentos_retorno_doc);
		
		if(doc_conf_gerencianet.client_id && doc_conf_gerencianet.client_secret) {
			retorno = doc_conf_gerencianet;
		}
	}

	return retorno;
}

function calcula_valor_total_boletos(doc) {
	var valor_total = 0;

	doc.faturas_selecionadas.forEach(function(item) {
		if(item.valor) {
			valor_total = valor_total + item.valor;
		}
	})

	return valor_total;
}

function retorna_doc(argumentos) {
    var retorno = null;
    frappe.call({
        method: "frappe.client.get",
        args: argumentos,
        async: false,
        callback(r) {
            if(r.message) {
                retorno = r.message;
            }
        }
    });
    
    return retorno;
}

function mostra_seleciona_fatura_multiselect(frm) {
	var d = new frappe.ui.form.MultiSelectDialog({
		doctype: "Sales Invoice",
		target: frm,
		setters: {
			customer: frm.doc.customer || undefined,
		},
		date_field: "posting_date",
		get_query: function() {
			return {
				query: 'boleto_bancario.boleto_bancario.doctype.emitir_boletos_por_faturas_de_venda.emitir_boletos_por_faturas_de_venda.filtrar_faturas_multiselect_dialog',
				filters: {
					company: frm.doc.company
				}
			}
		},
		action(selections) {
			if(selections.length > 0) {
				selections.forEach(function(item){
					const found = frm.doc.faturas_selecionadas.some(el => el.fatura === item);
					if(!found) {
						inserir_fatura_multiselectdialog(item, frm);
					}
				})

				frm.refresh_field('faturas_selecionadas');
				frm.doc.valor_boletos = calcula_valor_total_boletos(frm.doc);
				frm.refresh_field('valor_boletos');

				//d.hide();
			}
		}
	});
}

function inserir_fatura_multiselectdialog(selection, frm) {
	var argumentos_retorno_fatura_doc = {
		doctype: 'Sales Invoice',
		name: selection,
	};
				
	var doc_fatura = retorna_doc(argumentos_retorno_fatura_doc);

	var argumentos_retorno_cliente_doc = {
		doctype: 'Customer',
		name: doc_fatura.customer,
	};
		
	var doc_cliente = retorna_doc(argumentos_retorno_cliente_doc);					

	var childTableItem = frm.add_child('faturas_selecionadas');

	childTableItem.fatura = doc_fatura.name;
	childTableItem.valor = doc_fatura.outstanding_amount;
	childTableItem.cliente = doc_fatura.customer;
	childTableItem.cpfcnpj = doc_cliente.tax_id;
	childTableItem.telefone = doc_cliente.mobile_no;
	childTableItem.email = doc_cliente.email_id;

	if(doc_cliente.customer_type == 'Company') {
		childTableItem.tipo_cliente = 'Pessoa Jurídica';
	} else {
		childTableItem.tipo_cliente = 'Pessoa Física';
	}

	if(doc_fatura.net_total == doc_fatura.outstanding_amount) {
		childTableItem.parcelas = doc_fatura.payment_schedule.length;
	}
}

function atualiza_query_fatura(frm) {
	frm.fields_dict['faturas_selecionadas'].grid.get_field('fatura').get_query = function(doc) {
		return {
			query: 'boleto_bancario.boleto_bancario.doctype.emitir_boletos_por_faturas_de_venda.emitir_boletos_por_faturas_de_venda.filtrar_faturas_child_table',
			filters: {
				company: frm.doc.company
			}
		}
	};
}

function verifica_fatura_selecionada_duplicada(frm, indice_fatura, fatura) {
	var cloneArray = frm.doc.faturas_selecionadas.slice();
	cloneArray.splice(indice_fatura,1);

	const found = cloneArray.some(el => el.fatura === fatura);
	
	return found;
}

function gerar_boleto_gerencianet(
	client_id,
	client_secret,
	item,
	valor_gerencianet,
	qtde,
	data_vencimento,
	cnpj_bool,
	nome_cliente,
	numero_documento,
	email_cliente,
	telefone_cliente,
	fatura,
	emissao_fatura_venda,
	numero_parcela,
	valor) {
	
	var argumentos = {
		client_id: client_id,
		client_secret: client_secret,
		item: item,
		valor: valor_gerencianet,
		qtde: qtde,
		data_vencimento: data_vencimento,
		cnpj_bool: cnpj_bool,
		nome_cliente: nome_cliente,
		numero_documento: numero_documento,
		email_cliente: email_cliente,
		telefone_cliente: telefone_cliente,
	};

	frappe.call({
        method: "boleto_bancario.boleto_bancario.doctype.boletos_emitidos.boletos_emitidos.gerar_boleto_gerencianet",
        args: argumentos,
		async: true,
		freeze: true,
		freeze_message: 'Aguarde<br/>Gerando boletos<br/>Este processo pode demorar alguns minutos',
        callback(r) {
			if(r.message) {
				var retorno = r.message;
				
				if(retorno.code == 200) {
					criar_boleto_emitido(
						nome_cliente,
						telefone_cliente,
						email_cliente,
						cnpj_bool,
						numero_documento,
						'Gerencianet',
						emissao_fatura_venda,
						fatura,
						numero_parcela,
						valor,
						'Pendente',
						retorno.data.barcode,
						retorno.data.charge_id,
						retorno.data.link,
						retorno.data.pdf.charge,
						data_vencimento
					);
				}
            }
        }
	});
}

function criar_boleto_emitido(
	cliente,
	telefone,
	email,
	cnpj_bool,
	numero_documento,
	plataforma_emissora,
	emissao_fatura_venda,
	fatura,
	numero_parcela,
	valor,
	situacao,
	codigo_barras,
	codigo_cobranca,
	link_boleto,
	link_boleto_pdf,
	data_vencimento) {
	
	var tipo_cliente = 'Pessoa Física';
	if(cnpj_bool) {
		tipo_cliente = 'Pessoa Jurídica';
	}
	
	frappe.call({
		method: "frappe.client.insert",
		args: {
			doc:{
				doctype: "Boletos Emitidos",
				cliente: cliente,
				telefone: telefone,
				email: email,
				tipo_cliente: tipo_cliente,
				cpfcnpj: numero_documento,
				plataforma_emissora: plataforma_emissora,
				emissao_fatura_venda: emissao_fatura_venda,
				fatura: fatura,
				parcela: numero_parcela,
				valor: valor,
				situacao: situacao,
				codigo_barras: codigo_barras,
				codigo_cobranca: codigo_cobranca,
				link_boleto: link_boleto,
				link_boleto_pdf: link_boleto_pdf,
				docstatus: 1,
				data_vencimento: data_vencimento
			},
		},
		async: true,
		freeze: true,
		freeze_message: 'Aguarde<br/>Gerando boletos<br/>Este processo pode demorar alguns minutos',
		callback(response) {
			//
		}
	})
}

function realizar_cancelamento_boleto(frm, codigo_cobranca_array) {
	var conf_gerencianet = retorna_conf_plataforma_emissora(frm.doc.plataforma_emissora);

	codigo_cobranca_array.forEach(function(codigo_cobranca_item) {
		frappe.call({
			method: "boleto_bancario.boleto_bancario.doctype.boletos_emitidos.boletos_emitidos.realizar_cancelamento_boleto",
			args: {
				client_id: conf_gerencianet.client_id,
				client_secret: conf_gerencianet.client_secret,
				codigo_cobranca: codigo_cobranca_item.codigo_cobranca,
				name: codigo_cobranca_item.name,
			},
			async: true,
			freeze: true,
			freeze_message: 'Aguarde<br/>Atualizando situação dos boletos<br/>Este processo pode demorar alguns minutos',
			callback(response) {
				//console.log(response);
				//realizar_cancelamento_boleto(conf_gerencianet.client_id,  conf_gerencianet.client_secret, codigo_cobranca_item.codigo_cobranca, codigo_cobranca_item.name);

			}
		})
	})
}

function verificarCPF(cpf) {
	cpf = cpf.replace(/[^\d]+/g,'');	
	if(cpf == '') return false;	
	// Elimina CPFs invalidos conhecidos	
	if (cpf.length != 11 || 
		cpf == "00000000000" || 
		cpf == "11111111111" || 
		cpf == "22222222222" || 
		cpf == "33333333333" || 
		cpf == "44444444444" || 
		cpf == "55555555555" || 
		cpf == "66666666666" || 
		cpf == "77777777777" || 
		cpf == "88888888888" || 
		cpf == "99999999999")
			return false;		
	// Valida 1o digito	
	var add = 0;	
	for (var i=0; i < 9; i ++)		
		add += parseInt(cpf.charAt(i)) * (10 - i);	
	var rev = 11 - (add % 11);	
	if (rev == 10 || rev == 11)		
		rev = 0;	
	if (rev != parseInt(cpf.charAt(9)))		
		return false;		
	// Valida 2o digito	
	add = 0;	
	for (i = 0; i < 10; i ++)		
		add += parseInt(cpf.charAt(i)) * (11 - i);	
	rev = 11 - (add % 11);
	if (rev == 10 || rev == 11)	
		rev = 0;	
	if (rev != parseInt(cpf.charAt(10)))
		return false;		
	return true;   
}

function verificarCNPJ(cnpj) {
 
    cnpj = cnpj.replace(/[^\d]+/g,'');
 
    if(cnpj == '') return false;
     
    if (cnpj.length != 14)
        return false;
 
    // Elimina CNPJs invalidos conhecidos
    if (cnpj == "00000000000000" || 
        cnpj == "11111111111111" || 
        cnpj == "22222222222222" || 
        cnpj == "33333333333333" || 
        cnpj == "44444444444444" || 
        cnpj == "55555555555555" || 
        cnpj == "66666666666666" || 
        cnpj == "77777777777777" || 
        cnpj == "88888888888888" || 
        cnpj == "99999999999999")
        return false;
         
    // Valida DVs
    var tamanho = cnpj.length - 2
    var numeros = cnpj.substring(0,tamanho);
    var digitos = cnpj.substring(tamanho);
    var soma = 0;
    var pos = tamanho - 7;
    for (var i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2)
            pos = 9;
    }
    var resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitos.charAt(0))
        return false;
         
    tamanho = tamanho + 1;
    numeros = cnpj.substring(0,tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (var i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2)
            pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitos.charAt(1))
          return false;
           
    return true;   
}