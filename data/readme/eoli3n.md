# Sway Acid Dark 

[![Build Status](https://travis-ci.org/eoli3n/dotfiles.svg?branch=master)](https://travis-ci.org/eoli3n/dotfiles)

**Sway fish pure waybar neovim**

![alt tag](https://github.com/eoli3n/dotfiles/blob/master/screenshots/sway.png)

**Tiny irc client**

![alt tag](https://github.com/eoli3n/dotfiles/blob/master/screenshots/irc.png)

**Firefox/Tabliss Wofi**

![alt tag](https://github.com/eoli3n/dotfiles/blob/master/screenshots/ff.png)

**Connman/Thunar GTK Theme**

![alt tag](https://github.com/eoli3n/dotfiles/blob/master/screenshots/gtk.png)

### Why Ansible ?

- Modularity: [Roles](https://docs.ansible.com/ansible/latest/user_guide/playbooks_reuse_roles.html) as modules.
- Factorization: It uses [jinja2](https://docs.ansible.com/ansible-container/container_yml/template.html) templating engine.
- Simplicity: No agent, only SSH, available via pip.
- Flexibility: Push your dotfiles from/to any hosts.
- Toolbox: Dry-run mode, diff mode, secrets encryption, tags...

### How to

**Use carefully**, backup your home before using !  
You should use ``--check`` and ``--diff`` to dryrun first.

Check details in ``roles/*/README.md``.  

This project only manages dotfiles.  
To install required packages, use [arch-config](https://github.com/eoli3n/arch-config/blob/master/ansible/roles/desktop/tasks/main.yml), [void-config](https://github.com/eoli3n/void-config/blob/master/ansible/roles/desktop/tasks/main.yml) or [nix-config](https://github.com/eoli3n/nix-config/tree/master/modules/includes/).  

##### 1. Fork Me!

##### 2. Clone your repo

```
git clone https://github.com/*/dotfiles
```

Then, configure desktop environment in [group_vars/all.yml](group_vars/all.yml).

##### 3. Configure inventory

Create inventory file from template.

```
cd dotfiles
cp hosts.template hosts
```

Add your hostnames in section:
- ***cli***: only cli dotfiles
- ***desktop***: cli dotfiles + desktop environment  
Define which user will get configurations with *ansible_user* var.  

###### a. localhost run

```
[cli]
[desktop]
localhost ansible_connection=local
```

###### b. multiple hosts run

Note: *desktop* hosts **can't use root**.  

```
[cli]
server1 ansible_user=root
[desktop]
host1 ansible_user=user
host2 ansible_user=user2
```

##### 4. Configure SSH

Push your SSH public key on all your ``users@hosts``
```
ssh-copy-id -i path/to/ssh/key.pub user@host
```

##### 5. (Dry)Run

```
ansible-playbook install.yml -CD
ansible-playbook install.yml
```

For *desktop* hosts, if ``ansible_user`` is sudoer, to install cli tools for *root*, use:

```
ansible-playbook install.yml -l host1 -b -K
```

-----

##### Previously

* [i3-gaps Dark Solarized](https://github.com/eoli3n/dotfiles/tree/zsh-agnoster-solarized)
* [i3-gaps Acid Dark](https://github.com/eoli3n/dotfiles/tree/i3-gaps-acid-dark)
