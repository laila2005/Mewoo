# ═══════════════════════════════════════════════════════════════════════
#  PetPulse Graduation Project — Automate Jira Task Sync Script
# ═══════════════════════════════════════════════════════════════════════
#
# Description: Creates and assigns the 5 completed monorepo reorganization 
#              tasks directly to Laila's Jira board.
#

$Email = "laila.mohamed.fikry@gmail.com"
$JiraDomain = "lailamf2005.atlassian.net"
$ProjectKey = "TP1P"

Write-Host "🐾 PetPulse Atlassian Jira Automation Bootstrapper" -ForegroundColor Cyan
Write-Host "--------------------------------------------------------"
Write-Host "This script will push today's 5 completed Backend, DevOps, and"
Write-Host "GitHub organization tasks onto your Jira Board."
Write-Host ""
Write-Host "To run this, you need a Jira API Token."
Write-Host "Generate one here: https://id.atlassian.com/manage-profile/security/api-tokens"
Write-Host ""

$ApiToken = Read-Host -Prompt "🔑 Enter your Jira API Token"
if ([string]::IsNullOrEmpty($ApiToken)) {
    Write-Error "API Token cannot be empty."
    Exit
}

# Encode credentials for Basic Authorization
$Bytes = [System.Text.Encoding]::UTF8.GetBytes("${Email}:${ApiToken}")
$Base64 = [System.Convert]::ToBase64String($Bytes)
$Headers = @{
    "Authorization" = "Basic $Base64"
    "Content-Type"  = "application/json"
    "Accept"        = "application/json"
}

Write-Host "`n🔍 Resolving Atlassian AccountID for $Email..." -ForegroundColor Yellow
$SearchUrl = "https://${JiraDomain}/rest/api/3/user/search?query=${Email}"

try {
    $UserRes = Invoke-RestMethod -Uri $SearchUrl -Method Get -Headers $Headers
    if ($UserRes.Count -eq 0) {
        Write-Warning "Could not find user with email $Email. Issues will be created unassigned."
        $AccountId = $null
    } else {
        $AccountId = $UserRes[0].accountId
        $DisplayName = $UserRes[0].displayName
        Write-Host "✅ Found User: $DisplayName (ID: $AccountId)" -ForegroundColor Green
    }
} catch {
    Write-Error "Failed to authenticate or connect to Jira. Please check your API token and domain. Error: $_"
    Exit
}

# Define the tasks to be created
$Tasks = @(
    @{
        Summary = "Prune and Delete Obsolete Debug/Temporary Files"
        Description = "Clean up the repository root and backend folder of loose development-phase debug and testing scripts to enhance code security and establish professional monorepo standards. Deleted debug.mjs, fetch_chunk.mjs, and obsolete scripts under backend/scripts/."
    },
    @{
        Summary = "Establish Sandboxed Diagnostic Directory (backend/scratch)"
        Description = "Organize loose helper scripts and quick patches out of the active backend roots while preserving them in a dedicated sandbox/scratch folder for future development reference."
    },
    @{
        Summary = "Promote Integration & SQLi Penetration Tests to Tests Suite"
        Description = "Consolidate all automated test suites into a structured tests folder, moving high-value simulations (test_forgot_password.js and test_sqli.js) out of development helper directories to formalize the backend QA suite."
    },
    @{
        Summary = "Configure Shared Team Workspace Settings & Academic PR/Issue Templates"
        Description = "Configure professional team workspace standards (.vscode/settings.json) and academic Git templates designed to trace deliverables, coordinate QA dry-runs, and showcase strong SDLC methodologies to graders."
    },
    @{
        Summary = "Rebuild and Professionalize Monorepo Documentation (READMEs)"
        Description = "Update root README.md, ai-services/README.md, and petpulse-web/README.md to incorporate the newly cleaned folders, test procedures, and specific tips for the graduation project evaluation panel."
    }
)

Write-Host "`n🚀 Syncing Tasks to Jira Board..." -ForegroundColor Yellow

$CreateUrl = "https://${JiraDomain}/rest/api/3/issue"

foreach ($Task in $Tasks) {
    # Structure description payload using Atlassian Document Format (ADF)
    $DescDoc = @{
        type = "doc"
        version = 1
        content = @(
            @{
                type = "paragraph"
                content = @(
                    @{
                        type = "text"
                        text = $Task.Description
                    }
                )
            }
        )
    }

    $Fields = @{
        project = @{
            key = $ProjectKey
        }
        summary = $Task.Summary
        description = $DescDoc
        issuetype = @{
            name = "Task"
        }
    }

    if ($null -ne $AccountId) {
        $Fields.assignee = @{
            accountId = $AccountId
        }
    }

    $Payload = @{
        fields = $Fields
    } | ConvertTo-Json -Depth 10

    try {
        $IssueRes = Invoke-RestMethod -Uri $CreateUrl -Method Post -Headers $Headers -Body $Payload
        Write-Host "✅ Created Task: $($Task.Summary)" -ForegroundColor Green
        Write-Host "   Key: $($IssueRes.key) | URL: https://${JiraDomain}/browse/$($IssueRes.key)" -ForegroundColor Gray
        
        # Transition issue to 'Done' if desired (Optional - Jira transition API can be added here)
    } catch {
        Write-Error "Failed to create task '$($Task.Summary)'. Error: $_"
    }
}

Write-Host "`n🎉 All tasks synced successfully!" -ForegroundColor Green
