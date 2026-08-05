"""Harden CAMEL-derived tool schemas against argument smuggling.

Ported from CAMEL-AI's ``camel/toolkits/function_tool.py``
(``sanitize_and_enforce_required`` / ``_add_additional_properties_false``).

    Copyright 2023-2026 @ CAMEL-AI.org. All Rights Reserved.
    Licensed under the Apache License, Version 2.0.
    http://www.apache.org/licenses/LICENSE-2.0

Modifications from upstream: **only the ``additionalProperties: false`` walk is
ported.** Upstream's function also (a) strips ``default`` keys and (b) forces
every property into ``required`` with a nullable type. Both of those exist to
satisfy OpenAI *strict mode*, not to protect anything — and both would be
actively harmful here: Hermes does not run these schemas in strict mode, and
CAMEL toolkits lean on Python-side defaults, so promoting every optional
parameter to required-but-nullable would push models into passing explicit
nulls where upstream expects the argument omitted.

What is worth keeping is the security half. A JSON Schema object without
``additionalProperties: false`` accepts undeclared keys, so anything that
validates a tool call against the schema (a permission gate, an approval
hook, a policy adjudicator) can be walked past by attaching extra fields the
schema never mentioned. Setting it at *every* nesting level closes that.
"""

from __future__ import annotations

from typing import Any

# Schema keywords whose values hold further subschemas we must descend into.
_SUBSCHEMA_KEYS = ("items", "allOf", "oneOf", "anyOf")


def add_additional_properties_false(obj: Any) -> Any:
    """Recursively set ``additionalProperties: false`` on every object schema.

    Mutates *obj* in place (and returns it) exactly as upstream does. An
    explicit ``additionalProperties`` already present is left alone, so a
    toolkit that deliberately allows free-form keys keeps that behavior.
    """
    if isinstance(obj, dict):
        if obj.get("type") == "object" and "additionalProperties" not in obj:
            obj["additionalProperties"] = False

        for key, value in obj.items():
            if key == "properties" and isinstance(value, dict):
                for prop_value in value.values():
                    add_additional_properties_false(prop_value)
            elif key in _SUBSCHEMA_KEYS and isinstance(value, (dict, list)):
                if isinstance(value, dict):
                    add_additional_properties_false(value)
                else:
                    for item in value:
                        add_additional_properties_false(item)
            elif key == "$defs" and isinstance(value, dict):
                for def_value in value.values():
                    add_additional_properties_false(def_value)
    return obj


def harden_parameters(parameters: Any) -> Any:
    """Return a hardened copy of a tool's ``parameters`` subschema.

    Copies first so the toolkit's own ``FunctionTool`` schema object is never
    mutated — CAMEL caches those on the instance and reuses them.
    """
    import copy

    if not isinstance(parameters, dict):
        return parameters
    return add_additional_properties_false(copy.deepcopy(parameters))
