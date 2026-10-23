"""Postcode HTTPS configuration checks without external requests."""
import ssl
from unittest.mock import Mock

import postcodes


def test_postcode_lookup_uses_trusted_certificates(monkeypatch):
    response = Mock(status=200)
    response.read.return_value = b'{"result": {"region": "East Midlands", "country": "England"}}'
    connection = Mock()
    connection.getresponse.return_value = response
    connection_factory = Mock(return_value=connection)
    monkeypatch.setattr(postcodes.http.client, "HTTPSConnection", connection_factory)

    assert postcodes.postcode_to_region("NG1 2ET") == "East Midlands"

    context = connection_factory.call_args.kwargs["context"]
    assert context.verify_mode == ssl.CERT_REQUIRED
    assert context.check_hostname is True
    assert context.cert_store_stats()["x509_ca"] > 0
    connection.close.assert_called_once()
