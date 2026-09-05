# DSH and verifier compatibility baseline

`dsh-verified-ralph` 0.2.1 was audited against DeepSeek Harness
`dsh-v0.1.3-alpha.1` at commit
`d347e703908d0406b7a7ef80e3a0e594d86b2215`, and against
`dsh-as-a-verifier` 0.2.6 at merge commit
`359c41e6f3882c720c1d41f79d4f3ed6cb7d05f5`.

The audit confirms that the one-shot fresh-agent seam still exposes provider
capabilities, `inheritsParentContext`, structured output, `localAgent`, a
settling result promise, and explicit disposal. The Session v2 projection still
receives balanced step boundaries plus durable assistant message settlements,
tool calls, and tool results in the fields consumed by `projectSessionSteps`.
Embedded assistant streams and failed attempt settlements remain durable DSH
evidence but are not duplicated into verifier trajectory text.

The provider remains verifier protocol 1 and advertises offline progress
tracking. The consumer pins its exact merge commit and its Git-install smoke
loads both built packages, rejects a default export, and checks protocol and
capability compatibility before accepting the installation.

The DSH release still supports Node `^22.19.0 || >=24.0.0` and uses pnpm 11.7.0.
Node 24 is the primary build, Git-install, and release-check runtime. CI also
runs the complete suite on the exact minimum Node 22.19.0 on Linux and Windows.

DSH `0.1.3-alpha.1` packages were not available from the npm registry at the
time of this audit. Development dependencies and profile/full E2E launchers use
the latest published `0.1.2-rc.1` packages, peer ranges explicitly accept both
the installable release and the audited alpha, and a read-only source-contract
CI job guards the exact DSH release source.

All Harness-facing peers are optional in the package manifest. DSH profiles
supply them through the runtime module fallback rather than installing a second
copy into each profile, so a clean profile installation must also pass
`pnpm peers check` without manufacturing duplicate runtime dependencies.
