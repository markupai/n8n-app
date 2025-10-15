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
    local error_output=""
    
    log_info "$description..."
    log_debug "Executing: $command (in directory: $cwd)"
    
    # Capture both stdout and stderr, but show stderr only on failure
    if error_output=$(cd "$cwd" && eval "$command" 2>&1); then
        log_success "✓ $description"
        log_debug "Command output: $error_output"
        return 0
    else
        log_warning "⚠ $description failed (this is normal if the package was not previously linked)"
        # Only show error output if it's not empty and not just a "not found" message
        if [ -n "$error_output" ] && ! echo "$error_output" | grep -q "not found\|No such file\|command not found"; then
            log_error "Error details: $error_output"
        fi
        log_debug "Command failed with output: $error_output"
        return 1
    fi
}

# Execute command with error handling (strict mode - exits on failure)
exec_command_strict() {
    local description="$1"
    local command="$2"
    local cwd="${3:-.}"
    local error_output=""
    
    log_info "\n$description..."
    log_debug "Executing: $command (in directory: $cwd)"
    
    # Capture both stdout and stderr
    if error_output=$(cd "$cwd" && eval "$command" 2>&1); then
        log_success "✓ $description completed"
        log_debug "Command output: $error_output"
        return 0
    else
        log_error "✗ $description failed"
        # Always show error output for strict mode
        if [ -n "$error_output" ]; then
            log_error "Error details: $error_output"
        fi
        log_debug "Command failed with output: $error_output"
        return 1
    fi
}

# Debug mode (set DEBUG=1 to enable verbose output)
DEBUG="${DEBUG:-0}"

# Common paths
N8N_DIR="$HOME/.n8n"
CUSTOM_DIR="$N8N_DIR/custom"
CUSTOM_PACKAGE_JSON="$CUSTOM_DIR/package.json"
CONFIG_FILE="$N8N_DIR/config"
PACKAGE_NAME="@markupai/n8n-nodes-markupai"

# Debug logging function
log_debug() {
    if [ "$DEBUG" = "1" ]; then
        log "$YELLOW" "[DEBUG] $1"
    fi
}
