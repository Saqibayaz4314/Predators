variable "repository_names" {
  description = "Names of the ECR repositories to create"
  type        = list(string)
  default     = ["flood-digital-twin-frontend", "flood-digital-twin-backend"]
}

variable "image_tag_mutability" {
  description = "The tag mutability setting for the repository (MUTABLE or IMMUTABLE)"
  type        = string
  default     = "MUTABLE"
}

variable "scan_on_push" {
  description = "Indicates whether images are scanned after being pushed to the repository"
  type        = bool
  default     = true
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}
