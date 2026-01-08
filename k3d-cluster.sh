#!/bin/bash
# k3d Cluster Management Script for Planning Poker

set -e

CLUSTER_NAME="planning-poker"
CONFIG_FILE="k3d-config.yaml"

function create_cluster() {
    echo "Creating k3d cluster: ${CLUSTER_NAME}..."
    k3d cluster create --config ${CONFIG_FILE}
    echo "Cluster created successfully!"
    echo ""
    echo "Registry available at: localhost:5000"
    echo "API accessible via: localhost:8080"
    echo "UI accessible via: localhost:3000"
}

function delete_cluster() {
    echo "Deleting k3d cluster: ${CLUSTER_NAME}..."
    k3d cluster delete ${CLUSTER_NAME}
    echo "Cluster deleted successfully!"
}

function start_cluster() {
    echo "Starting k3d cluster: ${CLUSTER_NAME}..."
    k3d cluster start ${CLUSTER_NAME}
    echo "Cluster started successfully!"
}

function stop_cluster() {
    echo "Stopping k3d cluster: ${CLUSTER_NAME}..."
    k3d cluster stop ${CLUSTER_NAME}
    echo "Cluster stopped successfully!"
}

function status() {
    echo "k3d clusters:"
    k3d cluster list
    echo ""
    echo "kubectl context:"
    kubectl config current-context
    echo ""
    echo "Nodes:"
    kubectl get nodes
}

function build_and_push() {
    echo "Building and pushing images to local registry..."

    # Build API image
    echo "Building API image..."
    (cd api && docker build -t localhost:5000/planning-poker-api:latest .)
    docker push localhost:5000/planning-poker-api:latest

    # Build UI image
    echo "Building UI image..."
    (cd ui && docker build -t localhost:5000/planning-poker-ui:latest .)
    docker push localhost:5000/planning-poker-ui:latest

    echo "Images built and pushed successfully!"
}

function deploy() {
    echo "Deploying Planning Poker to k3d cluster..."

    # Install with Helm
    helm upgrade --install planning-poker ./helm/planning-poker \
        --set api.image.repository=planning-poker-registry:5000/planning-poker-api \
        --set api.image.tag=latest \
        --set ui.image.repository=planning-poker-registry:5000/planning-poker-ui \
        --set ui.image.tag=latest \
        --wait

    echo "Deployment complete!"
    echo ""
    echo "Access the application:"
    echo "  UI: http://localhost:3000"
    echo "  API: http://localhost:8080"
}

function redeploy() {
    echo "Rebuilding and redeploying Planning Poker..."
    build_and_push
    echo ""
    echo "Restarting deployments to pick up new images..."
    kubectl rollout restart deployment/planning-poker-api
    kubectl rollout restart deployment/planning-poker-ui
    echo ""
    echo "Waiting for rollouts to complete..."
    kubectl rollout status deployment/planning-poker-api
    kubectl rollout status deployment/planning-poker-ui
    echo ""
    echo "Redeploy complete!"
}

function logs() {
    SERVICE=${1:-ui}
    echo "Showing logs for ${SERVICE}..."
    kubectl logs -l app.kubernetes.io/name=planning-poker,app.kubernetes.io/component=${SERVICE} --tail=100 -f
}

function help() {
    echo "k3d Cluster Management for Planning Poker"
    echo ""
    echo "Usage: ./k3d-cluster.sh [command]"
    echo ""
    echo "Commands:"
    echo "  create        Create the k3d cluster"
    echo "  delete        Delete the k3d cluster"
    echo "  start         Start the cluster"
    echo "  stop          Stop the cluster"
    echo "  status        Show cluster status"
    echo "  build         Build and push images to local registry"
    echo "  deploy        Deploy application with Helm"
    echo "  redeploy      Rebuild images and restart deployments"
    echo "  logs [svc]    Show logs (api, ui, redis)"
    echo "  help          Show this help message"
    echo ""
    echo "Example workflow:"
    echo "  ./k3d-cluster.sh create"
    echo "  ./k3d-cluster.sh build"
    echo "  ./k3d-cluster.sh deploy"
    echo "  ./k3d-cluster.sh logs ui"
    echo ""
    echo "Quick redeploy after code changes:"
    echo "  ./k3d-cluster.sh redeploy"
}

# Main script
case "${1:-help}" in
    create)
        create_cluster
        ;;
    delete)
        delete_cluster
        ;;
    start)
        start_cluster
        ;;
    stop)
        stop_cluster
        ;;
    status)
        status
        ;;
    build)
        build_and_push
        ;;
    deploy)
        deploy
        ;;
    redeploy)
        redeploy
        ;;
    logs)
        logs ${2:-ui}
        ;;
    help|*)
        help
        ;;
esac
