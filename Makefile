STAGING_PROJECT=church-sync-pro-385703


deploy-stg:
	make deploy GOOGLE_CLOUD_PROJECT=${STAGING_PROJECT} NODE_ENV=staging ENV=.env.staging PROJECT_NAME=csp-fe DOCKER=DockerfileSTG

deploy-prd:
	make deploy GOOGLE_CLOUD_PROJECT=${STAGING_PROJECT} NODE_ENV=production ENV=.env.production PROJECT_NAME=csp-fe-prd DOCKER=DockerfilePRD

deploy:
	docker build --platform linux/amd64 --cache-from gcr.io/${GOOGLE_CLOUD_PROJECT}/${PROJECT_NAME} -t gcr.io/${GOOGLE_CLOUD_PROJECT}/${PROJECT_NAME} -f ${DOCKER} .
	docker push gcr.io/${GOOGLE_CLOUD_PROJECT}/${PROJECT_NAME}
	gcloud run deploy ${PROJECT_NAME} --image gcr.io/${GOOGLE_CLOUD_PROJECT}/${PROJECT_NAME} --project ${GOOGLE_CLOUD_PROJECT} \
	--platform managed \
	--region us-central1 \
	--port 8080 \
	--cpu 1 \
	--memory 1Gi \
	--concurrency 5 \
	--max-instances 10 \
	--timeout 1200 \
	--ingress all \
	--allow-unauthenticated \
	--set-env-vars `cat ${ENV} | xargs | tr ' ' ','` \
	--project ${GOOGLE_CLOUD_PROJECT}
	gcloud run services update-traffic ${PROJECT_NAME} --to-latest --project ${GOOGLE_CLOUD_PROJECT} --platform managed --region us-central1