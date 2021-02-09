# -*- coding: utf-8 -*-
from setuptools import setup, find_packages

with open('requirements.txt') as f:
	install_requires = f.read().strip().split('\n')

# get version from __version__ variable in boleto_bancario/__init__.py
from boleto_bancario import __version__ as version

setup(
	name='boleto_bancario',
	version=version,
	description='Emissao de Boletos Bancarios',
	author='Inova Techy',
	author_email='contato@inovatechy.com',
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires
)
