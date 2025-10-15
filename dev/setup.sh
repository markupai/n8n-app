#!/bin/bash

# Source common functions and constants
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Main setup function
main() {
    log_bright "\n===="
    log_bright "  n8n-nodes-markupai Development Setup"
    log_bright "===="
    
    log_info "Using npm package manager"

    # Step 1: Install dependencies
    if ! exec_command_strict "Step 1: Installing dependencies (including n8n)" "npm install"; then
        exit 1
    fi

    # Step 2: Build the code
    if ! exec_command_strict "Step 2: Building the code" "npm run build"; then
        exit 1
    fi

    # Step 3: Link the build from dist folder
    log_info "\nStep 3: Linking the package from dist folder"
    if exec_command_strict "Linking package from dist folder" "npm link" "dist"; then
        log_success "✓ Package linked from dist folder"
    else
        link_exit_code=$?
        log_error "✗ Failed to link package: $link_exit_code"
        log_warning "\nNote: Package linking may require admin privileges"
        log_warning "If it failed, try:"
        log_bright "  cd dist"
        log_bright "  sudo npm link"
    fi

    # Step 4: Setup custom directory in ~/.n8n
    log_info "\nStep 4: Setting up n8n custom directory"

    # Create .n8n directory if it doesn't exist
    if [ -d "$N8N_DIR" ]; then
        log_success "✓ .n8n directory already exists"
    else
        if mkdir -p "$N8N_DIR"; then
            log_success "✓ Created .n8n directory"
        else
            log_error "✗ Failed to create .n8n directory"
            exit 1
        fi
    fi

    # Fix permissions for n8n config file if it exists
    if [ -f "$CONFIG_FILE" ]; then
        if chmod 600 "$CONFIG_FILE" 2>/dev/null; then
            log_success "✓ Fixed n8n config file permissions"
        else
            log_warning "⚠ Could not fix config file permissions"
            log_warning "You may need to run: chmod 600 ~/.n8n/config"
        fi
    fi

    # Create custom directory if it doesn't exist
    if [ -d "$CUSTOM_DIR" ]; then
        log_success "✓ Custom directory already exists"
    else
        if mkdir -p "$CUSTOM_DIR"; then
            log_success "✓ Created custom directory"
        else
            log_error "✗ Failed to create custom directory"
            exit 1
        fi
    fi

    # Initialize npm in custom directory if package.json doesn't exist
    if [ -f "$CUSTOM_PACKAGE_JSON" ]; then
        log_success "✓ Custom directory already initialized"
    else
        log_info "Initializing npm in custom directory..."
        if exec_command_strict "Initializing custom directory" "npm init -y" "$CUSTOM_DIR"; then
            log_success "✓ Initialized custom directory"
        else
            log_error "✗ Failed to initialize custom directory"
            exit 1
        fi
    fi

    # Link the package in custom directory
    log_info "Linking package in custom directory..."
    if exec_command_strict "Linking package in custom directory" "npm link $PACKAGE_NAME" "$CUSTOM_DIR"; then
        log_success "✓ Package linked in custom directory"
    else
        log_error "✗ Failed to link package in custom directory"
        log_warning "You may need to run this manually:"
        log_bright "  cd $CUSTOM_DIR"
        log_bright "  npm link $PACKAGE_NAME"
    fi

    # Final message
    log_bright "\n===="
    log_success "  Setup Complete!"
    log_bright "===="
    
    log_warning "To start n8n with your development node, run:"
    log_bright "  npm start"
    
    log_info "This will use the local n8n from devDependencies."
    log_success "You should now see Markup AI in the list of nodes."
    log_success "Happy hacking! 🚀"
}

# Run main function
main "$@"