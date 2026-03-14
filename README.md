# AI-Interview-Preparation-Platform
The AI Interview Preparation Platform begins with the user providing inputs such as their resume, video, and audio.
These inputs are processed by the Flask backend, which acts as the main AI framework.
The system then divides the data into three specialized modules.
The Resume Module uses OCR and NLP techniques like NER, TF-IDF, and LSA to extract information and match skills with the job description.
The Emotion Module uses a CNN model to detect the user’s face and classify emotions from the video.
The Speech Module converts voice to text using speech recognition and evaluates the quality of communication through NLP analysis.
All the results from these three modules are then sent to the Technical Assessment Module, where a BERT-based model evaluates the user's answers and generates performance insights.
Finally, the platform presents an overall dashboard that displays the candidate’s technical score, resume match score, communication quality, and emotional behavior.
