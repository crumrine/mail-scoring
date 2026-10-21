# Copyright (c) 2026 Brian Crumrine
# SPDX-License-Identifier: Apache-2.0
using Workerd = import "/workerd/workerd.capnp";
const config :Workerd.Config = (
  services = [
    (name = "scorer", worker = (
      modules = [(name = "spike.js", esModule = embed "../../.artifacts/spike.js")],
      compatibilityDate = "2026-10-21",
      compatibilityFlags = ["no_nodejs_compat", "no_nodejs_compat_v2"],
      globalOutbound = "internet"
    )),
    # Override the implicit internet with a local service. There is NO network service or resolver.
    (name = "internet", worker = (
      modules = [(name = "deny.js", esModule = embed "deny.js")],
      compatibilityDate = "2026-10-21",
      compatibilityFlags = ["no_nodejs_compat", "no_nodejs_compat_v2"], globalOutbound = "internet"
    ))
  ]
);
