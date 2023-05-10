STAGING_PROJECT=church-sync-pro-385703


deploy-stg:
	make deploy GOOGLE_CLOUD_PROJECT=${STAGING_PROJECT} NODE_ENV=staging ENV=.env.staging

deploy:
	docker build --platform linux/amd64 --cache-from gcr.io/${GOOGLE_CLOUD_PROJECT}/csp-fe -t gcr.io/${GOOGLE_CLOUD_PROJECT}/csp-fe .
	docker push gcr.io/${GOOGLE_CLOUD_PROJECT}/csp-fe
	gcloud run deploy csp-fe --image gcr.io/${GOOGLE_CLOUD_PROJECT}/csp-fe --project ${GOOGLE_CLOUD_PROJECT} \
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