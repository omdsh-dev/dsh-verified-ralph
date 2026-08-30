# DSH and verifier compatibility baseline

`dsh-verified-ralph` 0.1.4 was audited against DeepSeek Harness
`dsh-v0.1.2-alpha.1` at commit
`cd5ef8148158c3a752a658978873241fdf8e2bbc`, and against
`dsh-as-a-verifier` 0.2.4 at merge commit
`d74f80deb2de5b71004c4e81ed7c094eda663de0`.

The audit confirms that the one-shot fresh-agent seam still exposes provider
capabilities, `inheritsParentContext`, structured output, `localAgent`, a
settling result promise, and explicit disposal. The session projection still
receives balanced step boundaries plus assistant messages, tool calls, and tool
results in the shapes consumed by `projectSessionSteps`.

The provider remains verifier protocol 1 and advertises offline progress
tracking. The consumer pins its exact merge commit and its Git-install smoke
loads both built packages, rejects a default export, and checks protocol and
capability compatibility before accepting the installation.

The DSH release still supports Node `^22.19.0 || >=24.0.0` and uses pnpm 11.7.0.
Node 24 is the primary build, Git-install, and release-check runtime. CI also
runs the complete suite on the exact minimum Node 22.19.0 on Linux and Windows.

DSH `0.1.2-alpha.1` packages were not available from the npm registry at the
time of this audit. Development dependencies remain on the latest published
`0.1.1-rc.2` packages, peer ranges explicitly accept the audited alpha, and a
read-only source-contract CI job guards the exact DSH release source.

All Harness-facing peers are optional in the package manifest. DSH profiles
supply them through the runtime module fallback rather than installing a second
copy into each profile, so a clean profile installation must also pass
`pnpm peers check` without manufacturing duplicate runtime dependencies.
