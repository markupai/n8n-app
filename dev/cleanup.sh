#!/bin/bash

# Source common functions and constants
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Main cleanup function
main() {
    log_bright "\n===="
    log_bright "  Cleanup Development Links"
    log_bright "===="
    
    log_info "Using npm package manager"

    # Unlink from custom directory
    log_info "\nStep 1: Unlinking from custom directory"
    exec_command "Unlinking from custom directory" "npm unlink $PACKAGE_NAME" "$CUSTOM_DIR"

    # Unlink from global
    log_info "\nStep 2: Unlinking from global npm"
    exec_command "Unlinking from global npm" "npm unlink -g $PACKAGE_NAME"

    log_bright "\n===="
    log_success "  Cleanup Complete!"
    log_bright "===="
    
    log_warning "You can now run:"
    log_bright "  npm run setup"
    log_success "to set up the development environment correctly."
}

# Run main function
main "$@"