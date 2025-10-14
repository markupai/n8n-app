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
    
    log_info "$description..."
    
    if (cd "$cwd" && eval "$command" 2>/dev/null); then
        log_success "✓ $description"
        return 0
    else
        log_warning "⚠ $description failed (this is normal if the package was not previously linked)"
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

# Get unlink command
get_unlink_command() {
    local pm="$1"
    local package="$2"
    case "$pm" in
        "yarn") echo "yarn unlink \"$package\"" ;;
        "pnpm") echo "pnpm unlink \"$package\"" ;;
        *) echo "npm unlink \"$package\"" ;;
    esac
}

# Get global unlink command
get_global_unlink_command() {
    local pm="$1"
    local package="$2"
    case "$pm" in
        "yarn") echo "yarn unlink -g \"$package\"" ;;
        "pnpm") echo "pnpm unlink -g \"$package\"" ;;
        *) echo "npm unlink -g \"$package\"" ;;
    esac
}

# Get setup command
get_setup_command() {
    local pm="$1"
    case "$pm" in
        "yarn") echo "yarn setup" ;;
        "pnpm") echo "pnpm run setup" ;;
        *) echo "npm run setup" ;;
    esac
}

# Main cleanup function
main() {
    log_bright "\n===="
    log_bright "  Cleanup Development Links"
    log_bright "===="
    
    # Detect package manager
    local package_manager
    package_manager=$(detect_package_manager)
    log_info "Detected package manager: $package_manager"
    
    # Unlink from custom directory
    log_info "\nStep 1: Unlinking from custom directory"
    local custom_dir="$HOME/.n8n/custom"
    local unlink_cmd
    unlink_cmd=$(get_unlink_command "$package_manager" "@markupai/n8n-nodes-markupai")
    exec_command "Unlinking from custom directory" "$unlink_cmd" "$custom_dir"
    
    # Unlink from global
    log_info "\nStep 2: Unlinking from global package manager"
    local global_unlink_cmd
    global_unlink_cmd=$(get_global_unlink_command "$package_manager" "@markupai/n8n-nodes-markupai")
    exec_command "Unlinking from global package manager" "$global_unlink_cmd"
    
    log_bright "\n===="
    log_success "  Cleanup Complete!"
    log_bright "===="
    
    log_warning "You can now run:"
    local setup_cmd
    setup_cmd=$(get_setup_command "$package_manager")
    log_bright "  $setup_cmd"
    log_success "to set up the development environment correctly."
}

# Run main function
main "$@"
