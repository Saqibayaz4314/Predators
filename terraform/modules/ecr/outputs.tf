output "repository_urls" {
  description = "Map of repository name to repository URL (aws_account_id.dkr.ecr.region.amazonaws.com/repositoryName)"
  value       = { for name, repo in aws_ecr_repository.repo : name => repo.repository_url }
}

output "repository_names" {
  description = "The names of the created repositories"
  value       = [for repo in aws_ecr_repository.repo : repo.name]
}

output "repository_arns" {
  description = "Map of repository name to full ARN"
  value       = { for name, repo in aws_ecr_repository.repo : name => repo.arn }
}

output "registry_id" {
  description = "The registry ID where the repositories were created"
  value       = length(var.repository_names) > 0 ? aws_ecr_repository.repo[var.repository_names[0]].registry_id : null
}
