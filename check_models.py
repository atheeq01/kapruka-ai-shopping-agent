
from google import genai

client = genai.Client(api_key="AIzaSyAxkk96K-0LB_qLihBi58O44MzzQLEpmYU")

for model in client.models.list():
    print(model.name)
