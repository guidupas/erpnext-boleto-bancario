from __future__ import unicode_literals
from frappe import _

def get_data():
    return [
        {
            "label": _("Boletos"),
            "items": [
                {
                    "type": "doctype",
                    "name": "Emitir Boletos por Faturas de Venda",
                    "label": _("Emitir Boletos por Faturas de Venda"),
                    "onboard": 1,
                },
                {
                    "type": "doctype",
                    "name": "Boletos Emitidos",
                    "label": _("Boletos Emitidos"),
                    "onboard": 1,
                },
            ]
        },
        {
            "label": _("Configurações"),
            "items": [
                {
                    "type": "doctype",
                    "name": "Configurar Plataforma Gerencianet",
                    "label": _("Configuração da Plataforma Gerencianet"),
                    "onboard": 1,
                    "settings": 1,
                },
            ]
        }
    ]