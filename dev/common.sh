#!/bin/bash
set -euo pipefail

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly BRIGHT='\033[1m'
readonly RESET='\033[0m'

# Debug mode (set DEBUG=1 to enable verbose output)
readonly DEBUG="${DEBUG:-0}"

# Logging functions
log() {
    local -r color="$1"
    local -r message="$2"
    echo -e "${color}${message}${RESET}"
    return 0
}

log_info() {
    local -r message="$1"
    log "$BLUE" "$message"
    return 0
}

log_success() {
    local -r message="$1"
    log "$GREEN" "$message"
    return 0
}

log_warning() {
    local -r message="$1"
    log "$YELLOW" "$message"
    return 0
}

log_error() {
    local -r message="$1"
    log "$RED" "$message"
    return 0
}

log_bright() {
    local -r message="$1"
    log "$BRIGHT" "$message"
    return 0
}

log_debug() {
    local -r message="$1"
    if [[ "$DEBUG" = "1" ]]; then
        log "$YELLOW" "[DEBUG] $message"
    fi
    return 0
}

# Execute command with error handling
exec_command() {
    local -r description="$1"
    local -r command="$2"
    local -r cwd="${3:-.}"
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
        if [[ -n "$error_output" ]] && ! echo "$error_output" | grep -q "not found\|No such file\|command not found"; then
            log_error "Error details: $error_output"
        fi
        log_debug "Command failed with output: $error_output"
        return 1
    fi
}

# Execute command with error handling (strict mode - exits on failure)
exec_command_strict() {
    local -r description="$1"
    local -r command="$2"
    local -r cwd="${3:-.}"
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
        if [[ -n "$error_output" ]]; then
            log_error "Error details: $error_output"
        fi
        log_debug "Command failed with output: $error_output"
        return 1
    fi
}

# Common paths
readonly N8N_DIR="$HOME/.n8n"
readonly CUSTOM_DIR="$N8N_DIR/custom"
readonly CUSTOM_PACKAGE_JSON="$CUSTOM_DIR/package.json"
readonly CONFIG_FILE="$N8N_DIR/config"
readonly PACKAGE_NAME="@markupai/n8n-nodes-markupai"
