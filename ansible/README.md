# Ansible Deployment

Deploys tatetodo to `usagi` (usagissh.skypattern.jp via Cloudflare Access).

## Redeploy everything

```bash
cd ansible
ansible-playbook site.yml -i inventory/hosts.yml
```

## Redeploy frontend only

Builds `frontend/` locally and rsyncs `dist/` to `/var/www/tatetodo/` on the server.

```bash
ansible-playbook site.yml -i inventory/hosts.yml --tags deploy-frontend
```

## Redeploy backend only

Builds `backend/` locally, rsyncs to `/opt/tatetodo/`, installs production deps, and restarts the `tatetodo` systemd service.

```bash
ansible-playbook site.yml -i inventory/hosts.yml --tags deploy-backend
```

## First-time server setup

Installs nginx, sets up the systemd service, etc. Only needed when provisioning a new server.

```bash
ansible-playbook site.yml -i inventory/hosts.yml --tags setup
```

## Requirements

- `cloudflared` installed and authenticated (SSH proxy goes through Cloudflare Access)
- SSH key at `~/.ssh/usagi`
