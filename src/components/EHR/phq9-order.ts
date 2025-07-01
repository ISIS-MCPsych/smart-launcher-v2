import type { fhirclient } from "fhirclient/lib/types.d"

export default function getPHQ9Order(patientId: string, providerId: string): fhirclient.FHIR.Resource {
    return {
        resourceType: 'ServiceRequest',
        status: 'active',
        intent: 'order',
        subject: {
        reference: `Patient/${patientId}`
        },
        requester: {
        reference: `Practitioner/${providerId}`
        },
        reasonCode: [
        {
            coding: [
            {
                system: 'http://terminology.hl7.org/CodeSystem/condition-code',
                code: 'problem',
                display: 'Depression'
            }
            ],
            text: 'Suspected depression'
        }
        ],
        code: {
        coding: [
            {
            system: 'http://loinc.org',
            code: '89579-2',
            display: 'Patient Health Questionnaire-9'
            }
        ]
        }
    }
}