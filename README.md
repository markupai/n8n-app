![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# Acrolinx for n8n

This repository contains a Acrolinx n8n node. It checks content, gives you the score and also a email template.

## Development

Install n8n locally

```
npm install n8n -g
```

Install dependencies after cloning this repository

```
npm install
```

Build the code

```
npm run build
```

Link the build

```
npm link
```

You need to create a `custom` directory inside n8n if it does not exist

```
# In ~/.n8n directory run
mkdir custom 
cd custom 
npm init
```

Link the custom folder to the build

```
npm link n8n-nodes-acrolinx
```

Start n8n

```
n8n start
```

You should now see Acrolinx in the list of nodes. Happy hacking!