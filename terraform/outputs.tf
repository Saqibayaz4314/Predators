output "vpc_id" {
  description = "The ID of the provisioned VPC"
  value       = module.vpc.vpc_id
}

output "ecr_repository_url" {
  description = "Amazon ECR Repository URL"
  value       = module.ecr.repository_url
}

output "ecr_repository_name" {
  description = "Amazon ECR Repository Name"
  value       = module.ecr.repository_name
}

output "eks_cluster_name" {
  description = "Amazon EKS Cluster Name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "Amazon EKS Cluster API Server Endpoint"
  value       = module.eks.cluster_endpoint
}

output "configure_kubectl_command" {
  description = "CLI command to generate local or CI/CD kubeconfig"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}
