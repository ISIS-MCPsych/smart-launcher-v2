import type { fhirclient } from "fhirclient/lib/types.d"

export default function getPHQ9Response(patientId: string): fhirclient.FHIR.Resource { 
    return {
        resourceType: 'QuestionnaireResponse',
        status: 'completed',
        subject: {
            reference: patientId
        },
        questionnaire: 'http://example.org/questionnaire/phq-9',
        item: [
        {
            linkId: 'phq1',
            answer: [
            {
                valueInteger: 2 // Replace with the patient's response
            }
            ]
        },
        {
            linkId: 'phq2',
            answer: [
            {
                valueInteger: 1 // Replace with the patient's response
            }
            ]
        },
        // Add more items for the remaining PHQ-9 questions
        ]
    }
}