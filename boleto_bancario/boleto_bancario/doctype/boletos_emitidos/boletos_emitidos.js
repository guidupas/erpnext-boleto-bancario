// Copyright (c) 2021, Inova Techy and contributors
// For license information, please see license.txt

frappe.ui.form.on('Boletos Emitidos', {
	refresh: function(frm) {
		if(frm.doc.docstatus == 1) {
			frm.add_custom_button(__('Ver boleto'), function() {
				window.open(frm.doc.link_boleto, "_blank");
			});
			frm.add_custom_button(__('Ver boleto em PDF'), function() {
				window.open(frm.doc.link_boleto_pdf, "_blank");
			});
		}
	},

	cliente: function(frm) {
		if(frm.doc.cliente) {
			var argumentos_retorno_doc = {
				doctype: 'Customer',
				name: frm.doc.cliente,
			};
			
			var doc_cliente = retorna_doc(argumentos_retorno_doc);
			
			frm.set_value('cpfcnpj', doc_cliente.tax_id);
			frm.set_value('telefone', doc_cliente.mobile_no);
			frm.set_value('email', doc_cliente.email_id);

			if(doc_cliente.customer_type == 'Company') {
				frm.set_value('tipo_cliente', 'Pessoa Jurídica');
			} else {
				frm.set_value('tipo_cliente', 'Pessoa Física');
			}
			
		} else {
			frm.set_value('cpfcnpj', '');
			frm.set_value('tipo_cliente', '');
			frm.set_value('telefone', '');
			frm.set_value('email', '');
		}

		frm.refresh_field('cpfcnpj');
		frm.refresh_field('telefone');
		frm.refresh_field('email');
		frm.refresh_field('tipo_cliente');
	},

	before_submit: function(frm) {
		var boleto_valido = true;
		
		const valida_telefone_regex = /^[1-9]{2}9?[0-9]{8}$/;
		
		if(retorna_conf_plataforma_emissora(frm.doc.plataforma_emissora) == null) {
			frappe.msgprint({
				title: __('Aviso'),
				indicator: 'red',
				message: __('Plataforma de emissão de boletos ' + frm.doc.plataforma_emissora + ' não configurada')
			});
			
			frappe.validated = false;
			boleto_valido = false;
		}else if(!valida_telefone_regex.test(frm.doc.telefone.replace(/[\-+./()\s]/g, ''))) {
			frappe.msgprint({
				title: __('Aviso'),
				indicator: 'red',
				message: __('Número de telefone inválido')
			});

			frappe.validated = false;
			boleto_valido = false;
		} else if(frm.doc.email && !frappe.utils.validate_type(frm.doc.email, 'email')) {
			frappe.msgprint({
				title: __('Aviso'),
				indicator: 'red',
				message: __('E-mail inválido')
			});

			frappe.validated = false;
			boleto_valido = false;
		} else if(frappe.datetime.get_day_diff(frm.doc.data_vencimento, frappe.datetime.now_date()) <= 0) {
			frappe.msgprint({
				title: __('Aviso'),
				indicator: 'red',
				message: __('Data de vencimento inválida')
			});

			frappe.validated = false;
			boleto_valido = false;
		} else {
			if(frm.doc.tipo_cliente == 'Pessoa Física') {
				if(frm.doc.cpfcnpj.replace(/[\-+./()\s]/g, '').length == 11) {
					if(!verificarCPF(frm.doc.cpfcnpj.replace(/[\-+./()\s]/g, ''))) {
						frappe.msgprint({
							title: __('Aviso'),
							indicator: 'red',
							message: __('Número do documento inválido')
						});

						frappe.validated = false;
						boleto_valido = false;
					}
				} else {
					frappe.msgprint({
						title: __('Aviso'),
						indicator: 'red',
						message: __('Número do documento inválido')
					});

					frappe.validated = false;
					boleto_valido = false;
				}
			} else {
				if(frm.doc.cpfcnpj.replace(/[\-+./()\s]/g, '').length == 14) {
					if(!verificarCNPJ(frm.doc.cpfcnpj.replace(/[\-+./()\s]/g, ''))) {
						frappe.msgprint({
							title: __('Aviso'),
							indicator: 'red',
							message: __('Número do documento inválido')
						});

						frappe.validated = false;
						boleto_valido = false;
					}
				} else {
					frappe.msgprint({
						title: __('Aviso'),
						indicator: 'red',
						message: __('Número do documento inválido')
					});

					frappe.validated = false;
					boleto_valido = false;
				}
			}
		}
		
		if(boleto_valido) {
			if(frm.doc.plataforma_emissora == 'Gerencianet') {
				var conf_gerencianet = retorna_conf_plataforma_emissora(frm.doc.plataforma_emissora);
				var boleto_item = 'Serviços realizados';
				var valor_gerencianet = frm.doc.valor.toFixed(2) * 100;
				var cnpj_bool = true;
				
				if(frm.doc.tipo_cliente == 'Pessoa Física') {
					cnpj_bool = false;
				}
						
				gerar_boleto_gerencianet(
					conf_gerencianet.client_id,
					conf_gerencianet.client_secret,
					boleto_item,
					valor_gerencianet,
					1,
					frm.doc.data_vencimento,
					cnpj_bool,
					frm.doc.cliente,
					frm.doc.cpfcnpj.replace(/[\-+./()\s]/g, ''),
					frm.doc.email || '',
					frm.doc.telefone.replace(/[\-+./()\s]/g, ''),
					frm
				);
			}
		}
	},

	before_cancel: function(frm) {
		var conf_gerencianet = retorna_conf_plataforma_emissora(frm.doc.plataforma_emissora);
		
		frappe.call({
			method: "boleto_bancario.boleto_bancario.doctype.boletos_emitidos.boletos_emitidos.realizar_cancelamento_boleto",
			args: {
				client_id: conf_gerencianet.client_id,
				client_secret: conf_gerencianet.client_secret,
				codigo_cobranca: frm.doc.codigo_cobranca,
				name: frm.doc.name,
			},
			async: true,
			freeze: true,
			freeze_message: 'Aguarde<br/>Atualizando situação dos boletos<br/>Este processo pode demorar alguns minutos',
			callback(response) {
				//console.log(response);
				//realizar_cancelamento_boleto(conf_gerencianet.client_id,  conf_gerencianet.client_secret, codigo_cobranca_item.codigo_cobranca, codigo_cobranca_item.name);

			}
		})
	}
});

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
	frm) {
	
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
		freeze_message: 'Aguarde<br/>Gerando boleto<br/>Este processo pode demorar alguns minutos',
        callback(r) {
			if(r.message) {
				var retorno = r.message;
				
				if(retorno.code == 200) {
					frm.doc.situacao = 'Pendente';
					frm.doc.codigo_barras = retorno.data.barcode;
					frm.doc.codigo_cobranca = retorno.data.charge_id;
					frm.doc.link_boleto = retorno.data.link;
					frm.doc.link_boleto_pdf = retorno.data.pdf.charge;
				}
            }
        }
	});
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