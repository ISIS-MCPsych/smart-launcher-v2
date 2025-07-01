import type { fhirclient } from "fhirclient/lib/types.d"

export default function getTreatmentOrder(patientId: string, providerId: string): fhirclient.FHIR.Resource {
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
                code: 'problem'
              }
            ],
            text: 'Chronic back pain'
          }
        ],
        code: {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: '108369006',
              display: 'Physical therapy'
            }
          ]
        }
      };
}