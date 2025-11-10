# lugia-sway-dots
[As seen on r/unixporn!](https://www.reddit.com/r/unixporn/comments/11r2z4d/sway_lugia_the_diving_pok%C3%A9mon/)

This is a rice of the Sway tiling window manager, with the wallpaper made by [Kipine on Deviantart.](https://www.deviantart.com/kipine/art/Lugia-s-Song-665948561)
![A screenshot of this rice in use.](lugiasway.png)

# Installation

## Dependencies
|Program|Purpose|
|-------|-------|
|Sway   |Window manager|
|dmenu| Application menu used by default|
|mate-polkit|Polkit agent|
|Waybar|Status bar|
|Alacritty|Terminal used by default|
|Thunar|File explorer used by default|
|[JetBrains Mono Nerd Font](https://github.com/ryanoasis/nerd-fonts/releases/download/v2.3.3/JetBrainsMono.zip)|Font used in the terminal and status bar|

## Optional dependencies
These programs are shown in the screenshot, but are not required to use these dotfiles.

|Program|Purpose|
|-------|-------|
|musikcube|Terminal music player|
|cava|Audio visualizer|
|peaclock|Terminal clock|
|pipes.sh|Eyecandy pipes effect|
|neofetch|Fetch tool|
|cowsay|Program that makes a cow say things|


## Install guide
1. Download the repo as a .zip by clicking on the green Code button, then Download as ZIP. 
2. Extract the .zip to your ~/.config directory.

# Notes

## cowsay neofetch
To get the cowsay neofetch as shown in the screenshot above, run `neofetch --stdout | cowsay -n`.
