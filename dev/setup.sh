#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BRIGHT='\033[1m'
RESET='\033[0m'

# Logging functions
log() {
    echo -e "${1}${2}${RESET}"
}

log_info() {
    log "$BLUE" "$1"
}

log_success() {
    log "$GREEN" "$1"
}

log_warning() {
    log "$YELLOW" "$1"
}

log_error() {
    log "$RED" "$1"
}

log_bright() {
    log "$BRIGHT" "$1"
}

# Execute command with error handling
exec_command() {
    local description="$1"
    local command="$2"
    local cwd="${3:-.}"
    
    log_info "\n$description..."
    
    if (cd "$cwd" && eval "$command"); then
        log_success "✓ $description completed"
        return 0
    else
        log_error "✗ $description failed"
        return 1
    fi
}

# Detect package manager
detect_package_manager() {
    if [ -f "yarn.lock" ]; then
        echo "yarn"
    elif [ -f "pnpm-lock.yaml" ]; then
        echo "pnpm"
    else
        echo "npm"
    fi
}

# Get install command
get_install_command() {
    local pm="$1"
    case "$pm" in
        "yarn") echo "yarn install" ;;
        "pnpm") echo "pnpm install" ;;
        *) echo "npm install" ;;
    esac
}

# Get build command
get_build_command() {
    local pm="$1"
    case "$pm" in
        "yarn") echo "yarn build" ;;
        "pnpm") echo "pnpm build" ;;
        *) echo "npm run build" ;;
    esac
}

# Get link command
get_link_command() {
    local pm="$1"
    case "$pm" in
        "yarn") echo "yarn link" ;;
        "pnpm") echo "pnpm link --global" ;;
        *) echo "npm link" ;;
    esac
}

# Get init command
get_init_command() {
    local pm="$1"
    case "$pm" in
        "yarn") echo "yarn init -y" ;;
        "pnpm") echo "pnpm init -y" ;;
        *) echo "npm init -y" ;;
    esac
}

# Get link package command
get_link_package_command() {
    local pm="$1"
    local package="$2"
    case "$pm" in
        "yarn") echo "yarn link \"$package\"" ;;
        "pnpm") echo "pnpm link \"$package\"" ;;
        *) echo "npm link \"$package\"" ;;
    esac
}

# Get start command
get_start_command() {
    local pm="$1"
    case "$pm" in
        "yarn") echo "yarn start" ;;
        "pnpm") echo "pnpm start" ;;
        *) echo "npm start" ;;
    esac
}

# Main setup function
main() {
    log_bright "\n===="
    log_bright "  n8n-nodes-markupai Development Setup"
    log_bright "===="
    
    # Detect package manager
    local package_manager
    package_manager=$(detect_package_manager)
    log_info "Detected package manager: $package_manager"
    
    # Step 1: Install dependencies
    local install_cmd
    install_cmd=$(get_install_command "$package_manager")
    if ! exec_command "Step 1: Installing dependencies (including n8n)" "$install_cmd"; then
        exit 1
    fi
    
    # Step 2: Build the code
    local build_cmd
    build_cmd=$(get_build_command "$package_manager")
    if ! exec_command "Step 2: Building the code" "$build_cmd"; then
        exit 1
    fi
    
    # Step 3: Link the build from dist folder
    log_info "\nStep 3: Linking the package from dist folder"
    local link_cmd
    link_cmd=$(get_link_command "$package_manager")
    if exec_command "Linking package from dist folder" "$link_cmd" "dist"; then
        log_success "✓ Package linked from dist folder"
    else
        log_error "✗ Failed to link package: $?"
        log_warning "\nNote: Package linking may require admin privileges"
        log_warning "If it failed, try:"
        log_bright "  cd dist"
        case "$package_manager" in
            "yarn") log_bright "  sudo yarn link" ;;
            "pnpm") log_bright "  sudo pnpm link --global" ;;
            *) log_bright "  sudo npm link" ;;
        esac
    fi
    
    # Step 4: Setup custom directory in ~/.n8n
    log_info "\nStep 4: Setting up n8n custom directory"
    local n8n_dir="$HOME/.n8n"
    local custom_dir="$n8n_dir/custom"
    
    # Create .n8n directory if it doesn't exist
    if [ -d "$n8n_dir" ]; then
        log_success "✓ .n8n directory already exists"
    else
        if mkdir -p "$n8n_dir"; then
            log_success "✓ Created .n8n directory"
        else
            log_error "✗ Failed to create .n8n directory"
            exit 1
        fi
    fi
    
    # Fix permissions for n8n config file if it exists
    local config_file="$n8n_dir/config"
    if [ -f "$config_file" ]; then
        if chmod 600 "$config_file" 2>/dev/null; then
            log_success "✓ Fixed n8n config file permissions"
        else
            log_warning "⚠ Could not fix config file permissions"
            log_warning "You may need to run: chmod 600 ~/.n8n/config"
        fi
    fi
    
    # Create custom directory if it doesn't exist
    if [ -d "$custom_dir" ]; then
        log_success "✓ Custom directory already exists"
    else
        if mkdir -p "$custom_dir"; then
            log_success "✓ Created custom directory"
        else
            log_error "✗ Failed to create custom directory"
            exit 1
        fi
    fi
    
    # Initialize package manager in custom directory if package.json doesn't exist
    local custom_package_json="$custom_dir/package.json"
    if [ -f "$custom_package_json" ]; then
        log_success "✓ Custom directory already initialized"
    else
        log_info "Initializing package manager in custom directory..."
        local init_cmd
        init_cmd=$(get_init_command "$package_manager")
        if exec_command "Initializing custom directory" "$init_cmd" "$custom_dir"; then
            log_success "✓ Initialized custom directory"
        else
            log_error "✗ Failed to initialize custom directory"
            exit 1
        fi
    fi
    
    # Link the package in custom directory
    log_info "Linking package in custom directory..."
    local link_package_cmd
    link_package_cmd=$(get_link_package_command "$package_manager" "@markupai/n8n-nodes-markupai")
    if exec_command "Linking package in custom directory" "$link_package_cmd" "$custom_dir"; then
        log_success "✓ Package linked in custom directory"
    else
        log_error "✗ Failed to link package in custom directory"
        log_warning "You may need to run this manually:"
        log_bright "  cd $custom_dir"
        log_bright "  $link_package_cmd"
    fi
    
    # Final message
    log_bright "\n===="
    log_success "  Setup Complete!"
    log_bright "===="
    
    log_warning "To start n8n with your development node, run:"
    local start_cmd
    start_cmd=$(get_start_command "$package_manager")
    log_bright "  $start_cmd"
    
    log_info "This will use the local n8n from devDependencies."
    log_success "You should now see Markup AI in the list of nodes."
    log_success "Happy hacking! 🚀"
}

# Run main function
main "$@"
